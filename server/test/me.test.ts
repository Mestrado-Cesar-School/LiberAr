import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { App } from "../src/app";
import { createApp, createTestUser, prisma, sampleProfileInput } from "./helpers";

describe("me", () => {
  let app: App;
  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it("GET /me exige token", async () => {
    const res = await app.inject({ method: "GET", url: "/me" });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("UNAUTHORIZED");
    const bad = await app.inject({ method: "GET", url: "/me", headers: { authorization: "Bearer invalido" } });
    expect(bad.statusCode).toBe(401);
  });

  it("GET /me devolve o snapshot", async () => {
    const { headers, email } = await createTestUser(app);
    const res = await app.inject({ method: "GET", url: "/me", headers });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user.email).toBe(email);
    expect(body.profile.email).toBe(email);
    expect(body.progress.totalMinutes).toBeGreaterThan(0);
    expect(body.cycles).toEqual([]);
    expect(body.fagerstrom).toBeNull();
    expect(body.triggers).toEqual([]);
  });

  it("PUT /me/profile cria a jornada para quem ainda não tem", async () => {
    const { headers } = await createTestUser(app, { withProfile: false });
    const before = await app.inject({ method: "GET", url: "/me", headers });
    expect(before.json().profile).toBeNull();
    expect(before.json().progress).toBeNull();

    const input = sampleProfileInput({ usageType: "ambos", vape: { nicotineMg: 35, juiceMl: 30, podDays: 15, juicePrice: 80, coilPrice: 30 }, avatar: 47 });
    const res = await app.inject({ method: "PUT", url: "/me/profile", headers, payload: input });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ usageType: "ambos", avatar: 47, vape: { podDays: 15 }, cigsPerPack: 20, reminderDays: [1, 2, 3, 4, 5] });

    const after = await app.inject({ method: "GET", url: "/me", headers });
    expect(after.json().progress.dailyCost).toBeCloseTo((15 * 12.5) / 20 + 110 / 15, 5);
  });

  it("PUT /me/profile substitui a jornada (campos omitidos voltam ao padrão)", async () => {
    const { headers } = await createTestUser(app);
    await app.inject({ method: "PATCH", url: "/me/profile", headers, payload: { reminderEnabled: true, stopReasonText: "pela família" } });
    const res = await app.inject({ method: "PUT", url: "/me/profile", headers, payload: sampleProfileInput({ cigsPerDay: 8 }) });
    expect(res.statusCode).toBe(200);
    expect(res.json().cigsPerDay).toBe(8);
    expect(res.json().reminderEnabled).toBe(false);
    expect(res.json().stopReasonText).toBeUndefined();
  });

  it("PATCH /me/profile atualiza parcialmente, inclusive nome e avatar", async () => {
    const { headers } = await createTestUser(app);
    const res = await app.inject({
      method: "PATCH",
      url: "/me/profile",
      headers,
      payload: { name: "Novo Nome", avatar: 12, reminderEnabled: true, reminderHour: 21, tourDone: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ name: "Novo Nome", avatar: 12, reminderEnabled: true, reminderHour: 21, cigsPerDay: 15 });

    const invalid = await app.inject({ method: "PATCH", url: "/me/profile", headers, payload: { reminderHour: 25 } });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("PATCH /me/profile sem jornada devolve 404", async () => {
    const { headers } = await createTestUser(app, { withProfile: false });
    const res = await app.inject({ method: "PATCH", url: "/me/profile", headers, payload: { tourDone: true } });
    expect(res.statusCode).toBe(404);
  });

  it("GET /me/export devolve todos os dados", async () => {
    const { user, headers, email } = await createTestUser(app);
    await prisma.checkIn.create({
      data: { userId: user.id, day: "2026-10-20", date: new Date("2026-10-20T12:00:00Z"), mood: "good", craving: 2 },
    });
    await prisma.conversation.create({
      data: { userId: user.id, messages: { create: [{ role: "user", text: "oi" }, { role: "assistant", text: "olá", source: "rules" }] } },
    });
    const res = await app.inject({ method: "GET", url: "/me/export", headers });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-disposition"]).toContain("liberar-meus-dados.json");
    const body = res.json();
    expect(body.user.email).toBe(email);
    expect(body.user.passwordHash).toBeUndefined();
    expect(body.profile.cigsPerDay).toBe(15);
    expect(body.checkIns).toHaveLength(1);
    expect(body.conversations[0].messages).toHaveLength(2);
    expect(body.exportedAt).toBeTruthy();
  });

  it("DELETE /me apaga a conta e tudo em cascata", async () => {
    const { user, headers, email } = await createTestUser(app);
    await prisma.triggerEntry.create({ data: { userId: user.id, date: new Date(), intensity: 3, gaveIn: false } });
    const login = await app.inject({ method: "POST", url: "/auth/login", payload: { email, password: "Senha123" } });
    const { refreshToken } = login.json();

    const res = await app.inject({ method: "DELETE", url: "/me", headers });
    expect(res.statusCode).toBe(204);

    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(await prisma.triggerEntry.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);

    const after = await app.inject({ method: "GET", url: "/me", headers });
    expect([401, 404]).toContain(after.statusCode);
    const refresh = await app.inject({ method: "POST", url: "/auth/refresh", payload: { refreshToken } });
    expect(refresh.statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/auth/login", payload: { email, password: "Senha123" } })).statusCode).toBe(401);
  });
});
