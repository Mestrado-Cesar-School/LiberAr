// Regras de negócio de autenticação: registro, login, senha e OAuth.
import { createHash, randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { FastifyBaseLogger, FastifyInstance } from "fastify";
import type { ProfileInput } from "../../domain/schemas";
import type { AuthResponse } from "../../domain/types";
import { AppError, emailTaken, invalidCode, invalidCredentials } from "../../lib/errors";
import { sendPasswordResetCode } from "../../lib/mailer";
import { prisma } from "../../lib/prisma";
import { buildSnapshot } from "../../lib/snapshot";
import { fullProfileData } from "../me/profileData";
import type { OAuthIdentity, OAuthProvider } from "./oauth";
import { issueTokenPair, revokeAllRefreshTokens } from "./tokens";

const BCRYPT_COST = 10;
const RESET_TTL_MS = 15 * 60_000;
const RESET_MAX_ATTEMPTS = 5;
// Hash "fantasma" para o login gastar o mesmo tempo quando o e-mail não existe.
const DUMMY_HASH = bcrypt.hashSync("liberar-dummy-password", BCRYPT_COST);

const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");

async function authResponse(app: FastifyInstance, userId: string): Promise<AuthResponse> {
  const [tokens, snapshot] = await Promise.all([issueTokenPair(app, userId), buildSnapshot(userId)]);
  return { ...tokens, snapshot };
}

export async function isEmailAvailable(email: string): Promise<boolean> {
  return !(await prisma.user.findUnique({ where: { email }, select: { id: true } }));
}

export async function register(
  app: FastifyInstance,
  input: { name: string; email: string; password: string; profile: ProfileInput }
): Promise<AuthResponse> {
  if (!(await isEmailAvailable(input.email))) throw emailTaken();
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  let userId: string;
  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        authMethod: "email",
        avatar: input.profile.avatar,
        termsAcceptedAt: new Date(),
        profile: { create: fullProfileData(input.profile) },
      },
      select: { id: true },
    });
    userId = user.id;
  } catch (err) {
    // Corrida entre a checagem e o insert: o índice único garante a resposta certa.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw emailTaken();
    throw err;
  }
  return authResponse(app, userId);
}

export async function login(app: FastifyInstance, email: string, password: string): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.passwordHash || !ok) throw invalidCredentials();
  return authResponse(app, user.id);
}

/** Gera e envia o código de recuperação. Silencioso quando o e-mail não existe. */
export async function requestPasswordReset(email: string, log?: FastifyBaseLogger): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return;
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.$transaction([
    prisma.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.passwordReset.create({
      data: { userId: user.id, codeHash: hashCode(code), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
    }),
  ]);
  try {
    await sendPasswordResetCode(email, code, log);
  } catch (err) {
    log?.error(err, "Falha ao enviar e-mail de recuperação de senha");
  }
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) throw invalidCode();
  const reset = await prisma.passwordReset.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!reset || reset.expiresAt.getTime() <= Date.now() || reset.attempts >= RESET_MAX_ATTEMPTS) {
    throw invalidCode();
  }
  if (reset.codeHash !== hashCode(code)) {
    await prisma.passwordReset.update({ where: { id: reset.id }, data: { attempts: { increment: 1 } } });
    throw invalidCode();
  }
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await prisma.$transaction([
    prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
  ]);
  await revokeAllRefreshTokens(user.id);
}

/**
 * Login social: localiza por providerSubject, senão vincula pelo e-mail,
 * senão cria a conta. Se vier `profile`, cria/substitui a jornada.
 */
export async function oauthLogin(
  app: FastifyInstance,
  provider: OAuthProvider,
  identity: OAuthIdentity,
  extra: { fullName?: string; profile?: ProfileInput }
): Promise<AuthResponse> {
  let user = await prisma.user.findUnique({ where: { providerSubject: identity.subject } });

  if (!user && identity.email) {
    const byEmail = await prisma.user.findUnique({ where: { email: identity.email } });
    if (byEmail) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: { providerSubject: identity.subject },
      });
    }
  }

  if (!user) {
    if (!identity.email) {
      throw new AppError(400, "VALIDATION_ERROR", "O provedor não informou um e-mail para criar a conta");
    }
    user = await prisma.user.create({
      data: {
        email: identity.email,
        name: identity.name ?? extra.fullName?.trim() ?? "Visitante",
        authMethod: provider,
        providerSubject: identity.subject,
        avatar: extra.profile?.avatar,
        termsAcceptedAt: extra.profile ? new Date() : null,
      },
    });
  }

  if (extra.profile) {
    const data = fullProfileData(extra.profile);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          termsAcceptedAt: user.termsAcceptedAt ?? new Date(),
          ...(extra.profile.avatar !== undefined ? { avatar: extra.profile.avatar } : {}),
        },
      }),
      prisma.profile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data }),
    ]);
  }

  return authResponse(app, user.id);
}
