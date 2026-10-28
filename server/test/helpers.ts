// Utilitários dos testes de integração. Regra: cada teste cria seus próprios
// usuários (e-mails únicos) e só faz asserções sobre os dados que criou — não
// há truncate global, para os módulos conviverem no mesmo banco.
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { App } from "../src/app";
import { buildApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import type { UserProfileInput } from "../src/domain/types";

export { prisma };

export async function createApp(): Promise<App> {
  const app = await buildApp();
  await app.ready();
  return app;
}

export const uniqueEmail = (prefix = "user") => `${prefix}-${randomUUID().slice(0, 8)}@teste.liberar`;

export const TEST_PASSWORD = "Senha123";

export function sampleProfileInput(overrides: Partial<UserProfileInput> = {}): UserProfileInput {
  const quit = new Date();
  quit.setDate(quit.getDate() - 10);
  return {
    quitDate: quit.toISOString(),
    cigsPerDay: 15,
    packPrice: 12.5,
    cigsPerPack: 20,
    usageType: "cigarro",
    stopMethod: "abrupto",
    smokeDuration: "5-10",
    stopReason: "saude",
    mainFear: "ansiedade",
    tourDone: true,
    ...overrides,
  };
}

/**
 * Cria um usuário direto no banco (com perfil por padrão) e devolve o
 * header Authorization pronto — não depende do módulo de auth.
 */
export async function createTestUser(
  app: App,
  opts: { withProfile?: boolean; email?: string; name?: string; password?: string } = {}
) {
  const email = opts.email ?? uniqueEmail();
  const user = await prisma.user.create({
    data: {
      email,
      name: opts.name ?? "Pessoa de Teste",
      passwordHash: await bcrypt.hash(opts.password ?? TEST_PASSWORD, 4),
      authMethod: "email",
      termsAcceptedAt: new Date(),
      ...(opts.withProfile === false
        ? {}
        : {
            profile: {
              create: {
                quitDate: sampleProfileInput().quitDate,
                cigsPerDay: 15,
                packPrice: 12.5,
                cigsPerPack: 20,
                usageType: "cigarro",
                stopMethod: "abrupto",
                tourDone: true,
              },
            },
          }),
    },
  });
  const accessToken = app.jwt.sign({ sub: user.id });
  return { user, email, accessToken, headers: { authorization: `Bearer ${accessToken}` } };
}
