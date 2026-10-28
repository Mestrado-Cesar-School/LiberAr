import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { App } from "../src/app";
import { createApp, prisma } from "./helpers";

// Unidades próprias do teste (ids únicos), independentes do seed.
const tag = randomUUID().slice(0, 8);
const UNITS = [
  { id: `t-${tag}-ubs-perto`, name: `UBS Zeta Perto ${tag}`, kind: "UBS", address: "Rua Alfa, 1 — Centro", distanceKm: 0.5, hours: "7h-19h", phone: "(31) 3000-0001", services: ["Grupo de apoio PNCT"], lat: -19.92, lng: -43.94, city: "Belo Horizonte", state: "MG" },
  { id: `t-${tag}-ubs-longe`, name: `UBS Zeta Longe ${tag}`, kind: "UBS", address: "Rua Beta, 2 — Pampulha", distanceKm: 9.0, hours: "7h-17h", phone: "(31) 3000-0002", services: ["Clínico geral"], lat: -19.86, lng: -43.97, city: "Belo Horizonte", state: "MG" },
  { id: `t-${tag}-caps`, name: `CAPS Zeta Esperança ${tag}`, kind: "CAPS", address: "Rua Gama, 3 — Floresta", distanceKm: 3.0, hours: "24h", phone: "(31) 3000-0003", services: ["Terapia em grupo"], lat: -19.91, lng: -43.93, city: "Belo Horizonte", state: "MG" },
  { id: `t-${tag}-sem-coord`, name: `UBS Zeta Sem Coordenada ${tag}`, kind: "UBS", address: "Rua Delta, 4 — Serra", distanceKm: 1.0, hours: "7h-19h", phone: "(31) 3000-0004", services: ["Enfermagem"], lat: null, lng: null, city: "Belo Horizonte", state: "MG" },
];
const ids = new Set(UNITS.map((u) => u.id));
const mine = (list: { id: string }[]) => list.filter((u) => ids.has(u.id));

describe("unidades de saúde", () => {
  let app: App;
  beforeAll(async () => {
    app = await createApp();
    for (const u of UNITS) await prisma.healthUnit.upsert({ where: { id: u.id }, create: u, update: u });
  });
  afterAll(async () => {
    await prisma.healthUnit.deleteMany({ where: { id: { in: [...ids] } } });
    await app.close();
  });

  it("lista pública ordenada pela distância de referência", async () => {
    const res = await app.inject({ method: "GET", url: "/health-units" });
    expect(res.statusCode).toBe(200);
    const list = mine(res.json());
    expect(list.map((u) => u.id)).toEqual([
      `t-${tag}-ubs-perto`, `t-${tag}-sem-coord`, `t-${tag}-caps`, `t-${tag}-ubs-longe`,
    ]);
    expect(list[0]).toMatchObject({ kind: "UBS", distanceKm: 0.5, phone: "(31) 3000-0001", services: ["Grupo de apoio PNCT"], city: "Belo Horizonte" });
  });

  it("filtra por tipo", async () => {
    const res = await app.inject({ method: "GET", url: `/health-units?kind=CAPS&q=${tag}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().map((u: { id: string }) => u.id)).toEqual([`t-${tag}-caps`]);
    const bad = await app.inject({ method: "GET", url: "/health-units?kind=HOSPITAL" });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("busca por nome, endereço e serviço sem diferenciar acentos", async () => {
    const byName = await app.inject({ method: "GET", url: `/health-units?q=zeta%20longe%20${tag}` });
    expect(byName.json().map((u: { id: string }) => u.id)).toEqual([`t-${tag}-ubs-longe`]);

    const byAccent = await app.inject({ method: "GET", url: `/health-units?q=esperanca%20${tag}` });
    expect(byAccent.json().map((u: { id: string }) => u.id)).toEqual([`t-${tag}-caps`]);

    const byAddress = await app.inject({ method: "GET", url: "/health-units?q=Rua%20Delta" });
    expect(mine(byAddress.json()).map((u) => u.id)).toEqual([`t-${tag}-sem-coord`]);

    const byService = await app.inject({ method: "GET", url: "/health-units?q=enfermagem" });
    expect(mine(byService.json()).map((u) => u.id)).toContain(`t-${tag}-sem-coord`);

    const none = await app.inject({ method: "GET", url: `/health-units?q=nada-${tag}` });
    expect(none.json()).toEqual([]);
  });

  it("com lat/lng recalcula a distância (Haversine) e reordena", async () => {
    // Origem perto da "UBS Zeta Longe" (Pampulha).
    const res = await app.inject({ method: "GET", url: `/health-units?q=${tag}&lat=-19.861&lng=-43.971` });
    expect(res.statusCode).toBe(200);
    const list = res.json();
    expect(list[0].id).toBe(`t-${tag}-ubs-longe`);
    expect(list[0].distanceKm).toBeLessThan(0.3);
    const perto = list.find((u: { id: string }) => u.id === `t-${tag}-ubs-perto`);
    expect(perto.distanceKm).toBeGreaterThan(5);
    expect(perto.distanceKm).toBeLessThan(9);
    // Sem coordenadas mantém a distância de referência do seed.
    const semCoord = list.find((u: { id: string }) => u.id === `t-${tag}-sem-coord`);
    expect(semCoord.distanceKm).toBe(1);
  });

  it("lat sem lng é rejeitado", async () => {
    const res = await app.inject({ method: "GET", url: "/health-units?lat=-19.9" });
    expect(res.statusCode).toBe(400);
  });

  it("detalhe por id e 404", async () => {
    const ok = await app.inject({ method: "GET", url: `/health-units/t-${tag}-caps` });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ id: `t-${tag}-caps`, kind: "CAPS", lat: -19.91, lng: -43.93 });
    const missing = await app.inject({ method: "GET", url: "/health-units/nao-existe" });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error.code).toBe("NOT_FOUND");
  });
});
