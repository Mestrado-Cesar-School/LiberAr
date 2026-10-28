import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { App } from "../src/app";
import { getLastResetCode } from "../src/lib/mailer";
import { createApp, createTestUser, prisma, sampleProfileInput, TEST_PASSWORD, uniqueEmail } from "./helpers";

// GOOGLE_CLIENT_ID precisa existir antes do config.ts ser importado.
vi.hoisted(() => {
  process.env.GOOGLE_CLIENT_ID = "google-client-id-de-teste";
});

const googleSub = `sub-${Date.now()}`;
const googleEmail = uniqueEmail("google");
vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    async verifyIdToken() {
      return { getPayload: () => ({ sub: googleSub, email: googleEmail, name: "Pessoa do Google" }) };
    }
  },
}));

const post = (app: App, url: string, payload: unknown, headers?: Record<string, string>) =>
  app.inject({ method: "POST", url, payload: payload as Record<string, unknown>, headers });

describe("auth", () => {
  let app: App;
  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(async () => {
    await app.close();
  });

  const registerPayload = (email = uniqueEmail("reg")) => ({
    name: "Mariana Silva",
    email,
    password: TEST_PASSWORD,
    profile: sampleProfileInput(),
    acceptedTerms: true,
  });

  it("POST /auth/register cria conta + perfil e devolve snapshot com progresso", async () => {
    const email = uniqueEmail("reg");
    const res = await post(app, "/auth/register", registerPayload(email));
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(body.snapshot.user.email).toBe(email);
    expect(body.snapshot.profile).toMatchObject({ name: "Mariana Silva", email, cigsPerDay: 15, authMethod: "email" });
    expect(body.snapshot.progress.days).toBeGreaterThanOrEqual(9);
    expect(body.snapshot.treatment).toMatchObject({ ubs: "", sideEffects: [] });
    expect(body.snapshot.checkIns).toEqual([]);
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user?.termsAcceptedAt).toBeInstanceOf(Date);
    expect(user?.passwordHash).not.toBe(TEST_PASSWORD);
  });

  it("POST /auth/register normaliza e-mail e rejeita duplicado com 409", async () => {
    const email = uniqueEmail("dup");
    expect((await post(app, "/auth/register", registerPayload(email))).statusCode).toBe(201);
    const res = await post(app, "/auth/register", registerPayload(`  ${email.toUpperCase()} `));
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("EMAIL_TAKEN");
  });

  it("POST /auth/register valida senha fraca e termos", async () => {
    const weak = await post(app, "/auth/register", { ...registerPayload(), password: "semnumero" });
    expect(weak.statusCode).toBe(400);
    expect(weak.json().error.code).toBe("VALIDATION_ERROR");
    const noTerms = await post(app, "/auth/register", { ...registerPayload(), acceptedTerms: false });
    expect(noTerms.statusCode).toBe(400);
  });

  it("POST /auth/check-email", async () => {
    const email = uniqueEmail("chk");
    expect((await post(app, "/auth/check-email", { email })).json()).toEqual({ available: true });
    await createTestUser(app, { email });
    expect((await post(app, "/auth/check-email", { email })).json()).toEqual({ available: false });
  });

  it("POST /auth/login com credenciais corretas e incorretas", async () => {
    const { email } = await createTestUser(app);
    const ok = await post(app, "/auth/login", { email, password: TEST_PASSWORD });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().snapshot.profile.email).toBe(email);

    const wrong = await post(app, "/auth/login", { email, password: "Errada123" });
    expect(wrong.statusCode).toBe(401);
    expect(wrong.json().error.code).toBe("INVALID_CREDENTIALS");

    const unknown = await post(app, "/auth/login", { email: uniqueEmail("nope"), password: TEST_PASSWORD });
    expect(unknown.statusCode).toBe(401);
    expect(unknown.json().error.code).toBe("INVALID_CREDENTIALS");
  });

  it("POST /auth/refresh rotaciona e invalida o token antigo", async () => {
    const { email } = await createTestUser(app);
    const { refreshToken, accessToken } = (await post(app, "/auth/login", { email, password: TEST_PASSWORD })).json();

    const first = await post(app, "/auth/refresh", { refreshToken });
    expect(first.statusCode).toBe(200);
    const next = first.json();
    expect(next.refreshToken).not.toBe(refreshToken);
    expect(next.accessToken).toBeTruthy();

    const reuse = await post(app, "/auth/refresh", { refreshToken });
    expect(reuse.statusCode).toBe(401);
    expect(reuse.json().error.code).toBe("UNAUTHORIZED");

    const me = await app.inject({ method: "GET", url: "/me", headers: { authorization: `Bearer ${next.accessToken}` } });
    expect(me.statusCode).toBe(200);
    expect(accessToken).toBeTruthy();
  });

  it("POST /auth/refresh rejeita token desconhecido", async () => {
    const res = await post(app, "/auth/refresh", { refreshToken: "x".repeat(64) });
    expect(res.statusCode).toBe(401);
  });

  it("POST /auth/logout revoga o refresh token (idempotente)", async () => {
    const { email } = await createTestUser(app);
    const { refreshToken } = (await post(app, "/auth/login", { email, password: TEST_PASSWORD })).json();
    expect((await post(app, "/auth/logout", { refreshToken })).statusCode).toBe(204);
    expect((await post(app, "/auth/logout", { refreshToken })).statusCode).toBe(204);
    expect((await post(app, "/auth/refresh", { refreshToken })).statusCode).toBe(401);
  });

  it("fluxo de recuperação de senha", async () => {
    const { email } = await createTestUser(app);
    const { refreshToken } = (await post(app, "/auth/login", { email, password: TEST_PASSWORD })).json();

    const forgot = await post(app, "/auth/forgot-password", { email });
    expect(forgot.statusCode).toBe(202);
    const code = getLastResetCode(email);
    expect(code).toMatch(/^\d{6}$/);

    // e-mail desconhecido também responde 202 (sem enumeração)
    expect((await post(app, "/auth/forgot-password", { email: uniqueEmail("ghost") })).statusCode).toBe(202);

    const wrongCode = code === "000000" ? "111111" : "000000";
    const bad = await post(app, "/auth/reset-password", { email, code: wrongCode, newPassword: "NovaSenha9" });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.code).toBe("INVALID_CODE");

    const ok = await post(app, "/auth/reset-password", { email, code, newPassword: "NovaSenha9" });
    expect(ok.statusCode).toBe(204);

    // código não pode ser reutilizado
    expect((await post(app, "/auth/reset-password", { email, code, newPassword: "Outra123" })).statusCode).toBe(400);

    expect((await post(app, "/auth/login", { email, password: TEST_PASSWORD })).statusCode).toBe(401);
    expect((await post(app, "/auth/login", { email, password: "NovaSenha9" })).statusCode).toBe(200);
    // sessões anteriores foram revogadas
    expect((await post(app, "/auth/refresh", { refreshToken })).statusCode).toBe(401);
  });

  it("reset-password bloqueia após 5 tentativas erradas", async () => {
    const { email } = await createTestUser(app);
    await post(app, "/auth/forgot-password", { email });
    const code = getLastResetCode(email)!;
    const wrong = code === "999999" ? "000000" : "999999";
    for (let i = 0; i < 5; i++) {
      expect((await post(app, "/auth/reset-password", { email, code: wrong, newPassword: "NovaSenha9" })).statusCode).toBe(400);
    }
    const res = await post(app, "/auth/reset-password", { email, code, newPassword: "NovaSenha9" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("INVALID_CODE");
  });

  it("POST /auth/oauth/google cria usuário novo e depois reencontra pelo providerSubject", async () => {
    const first = await post(app, "/auth/oauth/google", { idToken: "token-falso-do-google", profile: sampleProfileInput() });
    expect(first.statusCode).toBe(200);
    const body = first.json();
    expect(body.snapshot.user).toMatchObject({ email: googleEmail, name: "Pessoa do Google", authMethod: "google" });
    expect(body.snapshot.profile.cigsPerDay).toBe(15);
    const user = await prisma.user.findUnique({ where: { email: googleEmail } });
    expect(user?.providerSubject).toBe(`google:${googleSub}`);
    expect(user?.passwordHash).toBeNull();

    const again = await post(app, "/auth/oauth/google", { idToken: "token-falso-do-google" });
    expect(again.statusCode).toBe(200);
    expect(again.json().snapshot.user.id).toBe(body.snapshot.user.id);
    expect(again.json().snapshot.profile.cigsPerDay).toBe(15);
  });

  it("POST /auth/oauth/apple sem APPLE_CLIENT_ID devolve 503", async () => {
    const res = await post(app, "/auth/oauth/apple", { identityToken: "token-qualquer-apple" });
    expect(res.statusCode).toBe(503);
  });
});
