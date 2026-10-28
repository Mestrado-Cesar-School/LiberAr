import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { App } from "../src/app";
import { createApp, createTestUser } from "./helpers";

const pad2 = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const checkInBody = (date: Date, overrides: Record<string, unknown> = {}) => ({
  date: date.toISOString(),
  mood: "good",
  smoked: false,
  cigarettes: 0,
  craving: 2,
  symptoms: ["Ansiedade"],
  ...overrides,
});

describe("jornada", () => {
  let app: App;
  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it("exige autenticação", async () => {
    for (const url of ["/me/progress", "/me/checkins", "/me/cycles", "/me/fagerstrom", "/me/treatment", "/me/triggers"]) {
      const res = await app.inject({ method: "GET", url });
      expect(res.statusCode, url).toBe(401);
      expect(res.json().error.code).toBe("UNAUTHORIZED");
    }
    const res = await app.inject({ method: "POST", url: "/me/relapse", payload: {} });
    expect(res.statusCode).toBe(401);
  });

  describe("progresso", () => {
    it("calcula progresso e conquistas no servidor", async () => {
      const { headers } = await createTestUser(app); // Dia D há 10 dias
      const res = await app.inject({ method: "GET", url: "/me/progress", headers });
      expect(res.statusCode).toBe(200);
      const { progress, achievements } = res.json();
      expect(progress.days).toBeGreaterThanOrEqual(9);
      expect(progress.days).toBeLessThanOrEqual(10);
      expect(progress.cigsAvoided).toBeGreaterThan(130); // ~15/dia × 10 dias
      expect(progress.moneySaved).toBeGreaterThan(80); // 15 × 12,5/20 ≈ R$ 9,37/dia
      expect(progress.dailyCost).toBeCloseTo(9.375, 3);
      const byId = Object.fromEntries(achievements.map((a: { id: string; unlocked: boolean }) => [a.id, a.unlocked]));
      expect(byId.m20min).toBe(true);
      expect(byId.m72h).toBe(true);
      expect(byId.m2w).toBe(false);
      expect(achievements).toHaveLength(14);
    });

    it("404 sem perfil de jornada", async () => {
      const { headers } = await createTestUser(app, { withProfile: false });
      const res = await app.inject({ method: "GET", url: "/me/progress", headers });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("NOT_FOUND");
    });
  });

  describe("check-ins", () => {
    it("cria, substitui o mesmo dia sem duplicar, lista ordenado e remove", async () => {
      const { headers } = await createTestUser(app);
      const today = new Date();
      const yesterday = new Date(today.getTime() - 86_400_000);

      const created = await app.inject({
        method: "PUT",
        url: `/me/checkins/${dayKey(today)}`,
        headers,
        payload: checkInBody(today),
      });
      expect(created.statusCode).toBe(200);
      expect(created.json()).toMatchObject({ mood: "good", smoked: false, cigarettes: 0, craving: 2, symptoms: ["Ansiedade"] });
      expect(created.json().date).toBe(today.toISOString());

      // Edita o check-in de hoje: substitui em vez de duplicar.
      const replaced = await app.inject({
        method: "PUT",
        url: `/me/checkins/${dayKey(today)}`,
        headers,
        payload: checkInBody(today, { mood: "hard", smoked: true, cigarettes: 3, craving: 5, symptoms: [] }),
      });
      expect(replaced.statusCode).toBe(200);
      expect(replaced.json()).toMatchObject({ mood: "hard", smoked: true, cigarettes: 3, craving: 5, symptoms: [] });

      await app.inject({
        method: "PUT",
        url: `/me/checkins/${dayKey(yesterday)}`,
        headers,
        payload: checkInBody(yesterday, { mood: "anxious" }),
      });

      const list = await app.inject({ method: "GET", url: "/me/checkins", headers });
      expect(list.statusCode).toBe(200);
      const items = list.json();
      expect(items).toHaveLength(2);
      expect(items[0].mood).toBe("anxious"); // ontem primeiro (date asc)
      expect(items[1].mood).toBe("hard");

      // O lapso registrado desconta cigarros fumados do progresso.
      const progress = await app.inject({ method: "GET", url: "/me/progress", headers });
      expect(progress.json().progress.cigsAvoided).toBeLessThan(150);

      const del = await app.inject({ method: "DELETE", url: `/me/checkins/${dayKey(yesterday)}`, headers });
      expect(del.statusCode).toBe(204);
      const again = await app.inject({ method: "DELETE", url: `/me/checkins/${dayKey(yesterday)}`, headers });
      expect(again.statusCode).toBe(404);
      const after = await app.inject({ method: "GET", url: "/me/checkins", headers });
      expect(after.json()).toHaveLength(1);
    });

    it("valida payload e formato do dia", async () => {
      const { headers } = await createTestUser(app);
      const bad = await app.inject({
        method: "PUT",
        url: "/me/checkins/2026-01-01",
        headers,
        payload: { date: "x", mood: "feliz", smoked: "sim", cigarettes: -1, craving: 9 },
      });
      expect(bad.statusCode).toBe(400);
      expect(bad.json().error.code).toBe("VALIDATION_ERROR");
      expect(bad.json().error.details.issues.length).toBeGreaterThan(0);

      const badDay = await app.inject({
        method: "PUT",
        url: "/me/checkins/01-01-2026",
        headers,
        payload: checkInBody(new Date()),
      });
      expect(badDay.statusCode).toBe(400);
    });
  });

  describe("recaída (reiniciar contagem)", () => {
    it("encerra a sequência como ciclo e zera o cronômetro preservando a economia", async () => {
      const { headers } = await createTestUser(app);
      const before = (await app.inject({ method: "GET", url: "/me/progress", headers })).json().progress;

      const res = await app.inject({ method: "POST", url: "/me/relapse", headers, payload: {} });
      expect(res.statusCode).toBe(200);
      const { profile, cycles } = res.json();
      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toMatchObject({ label: "Ciclo 1", days: before.days });
      expect(cycles[0].id).toBeTruthy();
      expect(profile.lastLapseDate).toBeTruthy();
      expect(new Date(profile.lastLapseDate).getTime()).toBeGreaterThan(new Date(profile.quitDate).getTime());

      const after = (await app.inject({ method: "GET", url: "/me/progress", headers })).json().progress;
      expect(after.days).toBe(0);
      expect(after.totalMinutes).toBeLessThanOrEqual(1);
      expect(after.moneySaved).toBeGreaterThanOrEqual(before.moneySaved - 0.01); // economia desde o Dia D preservada

      // Segundo reinício, sem body: Ciclo 2
      const second = await app.inject({ method: "POST", url: "/me/relapse", headers });
      expect(second.statusCode).toBe(200);
      expect(second.json().cycles.map((c: { label: string }) => c.label)).toEqual(["Ciclo 1", "Ciclo 2"]);

      const list = await app.inject({ method: "GET", url: "/me/cycles", headers });
      expect(list.json()).toHaveLength(2);
      expect(list.json()[1].days).toBe(0);
    });

    it("404 sem perfil", async () => {
      const { headers } = await createTestUser(app, { withProfile: false });
      const res = await app.inject({ method: "POST", url: "/me/relapse", headers, payload: {} });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("Fagerström", () => {
    it("devolve null antes e o mais recente depois", async () => {
      const { headers } = await createTestUser(app);
      const empty = await app.inject({ method: "GET", url: "/me/fagerstrom", headers });
      expect(empty.statusCode).toBe(200);
      expect(empty.body).toBe("null");
      expect(empty.json()).toBeNull();

      const first = await app.inject({
        method: "PUT",
        url: "/me/fagerstrom",
        headers,
        payload: { score: 3, label: "Baixa", date: "01/10/2026" },
      });
      expect(first.statusCode).toBe(200);
      expect(first.json()).toEqual({ score: 3, label: "Baixa", date: "01/10/2026" });

      const second = await app.inject({
        method: "PUT",
        url: "/me/fagerstrom",
        headers,
        payload: { score: 7, label: "Elevada", date: "20/10/2026" },
      });
      expect(second.statusCode).toBe(200);

      const latest = await app.inject({ method: "GET", url: "/me/fagerstrom", headers });
      expect(latest.json()).toEqual({ score: 7, label: "Elevada", date: "20/10/2026" });

      const bad = await app.inject({ method: "PUT", url: "/me/fagerstrom", headers, payload: { score: 11, label: "", date: "" } });
      expect(bad.statusCode).toBe(400);
    });
  });

  describe("tratamento", () => {
    it("vazio antes, upsert depois", async () => {
      const { headers } = await createTestUser(app);
      const empty = await app.inject({ method: "GET", url: "/me/treatment", headers });
      expect(empty.statusCode).toBe(200);
      expect(empty.json()).toEqual({
        viaApp: null, ubs: "", professional: "", startDate: "", adesivo: null, oral: null, med: null, adherence: null, sideEffects: [], notes: "",
      });

      const body = {
        viaApp: true, ubs: "UBS Centro", professional: "Enf. Carla", startDate: "2026-10-01",
        adesivo: "ad14", oral: null, med: "bup150", adherence: "total", sideEffects: ["Insônia"], notes: "ok",
      };
      const put = await app.inject({ method: "PUT", url: "/me/treatment", headers, payload: body });
      expect(put.statusCode).toBe(200);
      expect(put.json()).toEqual(body);

      const updated = { ...body, adesivo: "ad7", sideEffects: [] as string[] };
      const put2 = await app.inject({ method: "PUT", url: "/me/treatment", headers, payload: updated });
      expect(put2.json()).toEqual(updated);
      const get = await app.inject({ method: "GET", url: "/me/treatment", headers });
      expect(get.json()).toEqual(updated);

      const bad = await app.inject({ method: "PUT", url: "/me/treatment", headers, payload: { ...body, startDate: "01/10/2026" } });
      expect(bad.statusCode).toBe(400);
    });
  });

  describe("gatilhos", () => {
    it("registra e lista do mais recente para o mais antigo", async () => {
      const { headers } = await createTestUser(app);
      const older = { date: new Date(Date.now() - 2 * 86_400_000).toISOString(), place: "Bar", emotion: "Alegria", people: "Com amigos", intensity: 5, gaveIn: false, note: "antigo" };
      const newer = { date: new Date().toISOString(), place: null, emotion: "Estresse", people: null, intensity: 3, gaveIn: true, note: "" };

      const r1 = await app.inject({ method: "POST", url: "/me/triggers", headers, payload: older });
      expect(r1.statusCode).toBe(201);
      expect(r1.json()).toMatchObject(older);
      expect(r1.json().id).toBeTruthy();
      const r2 = await app.inject({ method: "POST", url: "/me/triggers", headers, payload: newer });
      expect(r2.statusCode).toBe(201);

      const list = await app.inject({ method: "GET", url: "/me/triggers", headers });
      expect(list.statusCode).toBe(200);
      expect(list.json().map((t: { note: string }) => t.note)).toEqual(["", "antigo"]);

      const bad = await app.inject({ method: "POST", url: "/me/triggers", headers, payload: { ...newer, intensity: 0 } });
      expect(bad.statusCode).toBe(400);
    });
  });
});
