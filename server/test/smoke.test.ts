import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp, createTestUser } from "./helpers";
import type { App } from "../src/app";

describe("infra", () => {
  let app: App;
  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it("GET /health responde ok com banco acessível", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "ok", db: "ok", llm: "rules" });
  });

  it("rota inexistente devolve erro padronizado", async () => {
    const res = await app.inject({ method: "GET", url: "/nao-existe" });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });

  it("helper cria usuário autenticável", async () => {
    const { user, headers } = await createTestUser(app);
    expect(user.id).toBeTruthy();
    expect(headers.authorization).toMatch(/^Bearer /);
  });

  it("preflight CORS libera PUT, PATCH e DELETE para o app", async () => {
    for (const method of ["PUT", "PATCH", "DELETE"]) {
      const res = await app.inject({
        method: "OPTIONS",
        url: "/me/checkins/2026-10-28",
        headers: {
          origin: "http://localhost:8081",
          "access-control-request-method": method,
          "access-control-request-headers": "authorization,content-type",
        },
      });
      expect(res.statusCode).toBe(204);
      expect(res.headers["access-control-allow-methods"]).toContain(method);
      expect(res.headers["access-control-allow-headers"]).toContain("authorization");
    }
  });

  it("OpenAPI é gerado", async () => {
    const res = await app.inject({ method: "GET", url: "/docs/json" });
    expect(res.statusCode).toBe(200);
    expect(res.json().info.title).toBe("LiberAr API");
  });
});
