// Access token (JWT) + refresh token opaco rotativo guardado como SHA-256.
import { createHash, randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { config } from "../../config";
import { unauthorized } from "../../lib/errors";
import { prisma } from "../../lib/prisma";

export type TokenPair = { accessToken: string; refreshToken: string };

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const newRefreshToken = () => randomBytes(48).toString("base64url");
const refreshExpiry = () => new Date(Date.now() + config.REFRESH_TTL_DAYS * 86_400_000);

export async function issueTokenPair(app: FastifyInstance, userId: string): Promise<TokenPair> {
  const refreshToken = newRefreshToken();
  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(refreshToken), expiresAt: refreshExpiry() },
  });
  return { accessToken: app.jwt.sign({ sub: userId }), refreshToken };
}

/** Rotação: o token antigo é revogado e um novo par é emitido. */
export async function rotateRefreshToken(app: FastifyInstance, refreshToken: string): Promise<TokenPair> {
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
  if (!row || row.revokedAt || row.expiresAt.getTime() <= Date.now()) {
    throw unauthorized("Sessão expirada. Entre novamente.");
  }
  const next = newRefreshToken();
  await prisma.$transaction([
    prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } }),
    prisma.refreshToken.create({
      data: { userId: row.userId, tokenHash: hashToken(next), expiresAt: refreshExpiry() },
    }),
  ]);
  return { accessToken: app.jwt.sign({ sub: row.userId }), refreshToken: next };
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
