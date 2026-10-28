import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { App } from "../src/app";
import { setLlmClientForTests, toAlternatingMessages, type LlmClient } from "../src/modules/chat/llm";
import { detectCrisis, medicationNotice, MEDICATION_NOTICE } from "../src/modules/chat/guardrails";
import { createApp, createTestUser } from "./helpers";

type FakeResponse = { content: unknown[]; stop_reason: string; usage?: unknown; model?: string };

function fakeClient(response: FakeResponse | Error, calls: unknown[] = []): LlmClient {
  return {
    beta: {
      messages: {
        create: async (params) => {
          calls.push(params);
          if (response instanceof Error) throw response;
          return {
            id: "msg_fake",
            type: "message",
            role: "assistant",
            model: response.model ?? "claude-opus-5-5",
            stop_sequence: null,
            stop_details: null,
            usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
            ...response,
          } as never;
        },
      },
    },
  };
}

describe("chat — guardrails (unitário)", () => {
  it("detecta ideação suicida com e sem acento", () => {
    expect(detectCrisis("não quero mais viver")).toBe(true);
    expect(detectCrisis("Nao aguento, penso em me matar")).toBe(true);
    expect(detectCrisis("quero sumir de vez")).toBe(true);
    expect(detectCrisis("Estou com fissura")).toBe(false);
    expect(detectCrisis("vontade de fumar depois do café")).toBe(false);
  });

  it("anexa o lembrete de medicação apenas quando fala de remédios, sem duplicar", () => {
    const withMed = medicationNotice("A bupropiona 150mg é usada no PNCT.");
    expect(withMed.endsWith(MEDICATION_NOTICE)).toBe(true);
    expect(medicationNotice(withMed)).toBe(withMed);
    expect(medicationNotice("Respire fundo e beba água.")).toBe("Respire fundo e beba água.");
  });

  it("concatena turnos consecutivos do mesmo papel e começa por user", () => {
    const msgs = toAlternatingMessages([
      { role: "assistant", text: "olá" },
      { role: "user", text: "oi" },
      { role: "user", text: "tudo bem?" },
      { role: "assistant", text: "sim" },
    ]);
    expect(msgs.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(msgs[0].content).toBe("oi\n\ntudo bem?");
  });
});

describe("chat — rotas", () => {
  let app: App;
  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(async () => {
    await app.close();
  });
  afterEach(() => {
    setLlmClientForTests(null);
  });

  it("exige autenticação", async () => {
    const res = await app.inject({ method: "GET", url: "/me/chat" });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("UNAUTHORIZED");
  });

  it("GET cria uma conversa vazia", async () => {
    const { headers } = await createTestUser(app);
    const res = await app.inject({ method: "GET", url: "/me/chat", headers });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.conversationId).toBeTruthy();
    expect(body.messages).toEqual([]);

    const again = await app.inject({ method: "GET", url: "/me/chat", headers });
    expect(again.json().conversationId).toBe(body.conversationId);
  });

  it("sem chave de LLM responde pelo motor de regras", async () => {
    const { headers } = await createTestUser(app);
    const res = await app.inject({
      method: "POST",
      url: "/me/chat/messages",
      headers,
      payload: { text: "estou com fissura" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.source).toBe("rules");
    expect(body.crisis).toBe(false);
    expect(body.userMessage).toMatchObject({ role: "user", text: "estou com fissura" });
    expect(body.assistantMessage.role).toBe("assistant");
    expect(/4 Ds|Respira/.test(body.assistantMessage.text)).toBe(true);
  });

  it("guardrail de crise responde com CVV 188 sem chamar o LLM", async () => {
    const calls: unknown[] = [];
    setLlmClientForTests(fakeClient({ content: [{ type: "text", text: "não deveria ser chamado" }], stop_reason: "end_turn" }, calls));
    const { headers } = await createTestUser(app);
    const res = await app.inject({
      method: "POST",
      url: "/me/chat/messages",
      headers,
      payload: { text: "não aguento mais, quero me matar" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.source).toBe("guardrail");
    expect(body.crisis).toBe(true);
    expect(body.assistantMessage.text).toContain("188");
    expect(body.assistantMessage.text).toContain("192");
    expect(calls).toHaveLength(0);
  });

  it("persiste o histórico em ordem e DELETE apaga", async () => {
    const { headers } = await createTestUser(app);
    await app.inject({ method: "POST", url: "/me/chat/messages", headers, payload: { text: "quanto já economizei?" } });
    const res = await app.inject({ method: "GET", url: "/me/chat", headers });
    const msgs = res.json().messages;
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toMatchObject({ role: "user", text: "quanto já economizei?" });
    expect(msgs[1].role).toBe("assistant");
    expect(msgs[1].text).toMatch(/economizou R\$/);

    const del = await app.inject({ method: "DELETE", url: "/me/chat", headers });
    expect(del.statusCode).toBe(204);
    const after = await app.inject({ method: "GET", url: "/me/chat", headers });
    expect(after.json().messages).toEqual([]);
    expect(after.json().conversationId).not.toBe(res.json().conversationId);
  });

  it("valida o corpo (texto vazio ou longo demais)", async () => {
    const { headers } = await createTestUser(app);
    const empty = await app.inject({ method: "POST", url: "/me/chat/messages", headers, payload: { text: "   " } });
    expect(empty.statusCode).toBe(400);
    expect(empty.json().error.code).toBe("VALIDATION_ERROR");
    const long = await app.inject({ method: "POST", url: "/me/chat/messages", headers, payload: { text: "a".repeat(2001) } });
    expect(long.statusCode).toBe(400);
  });

  it("usuário sem perfil recebe resposta neutra pelas regras", async () => {
    const { headers } = await createTestUser(app, { withProfile: false });
    const res = await app.inject({ method: "POST", url: "/me/chat/messages", headers, payload: { text: "oi" } });
    expect(res.statusCode).toBe(200);
    expect(res.json().source).toBe("rules");
    expect(res.json().assistantMessage.text).toContain("Estou aqui por você");
  });

  it("com Claude (mock) responde source=claude e anexa o lembrete de medicação", async () => {
    const calls: Array<{ model: string; system: unknown; messages: Array<{ role: string }> }> = [];
    setLlmClientForTests(
      fakeClient({ content: [{ type: "text", text: "Resposta sobre bupropiona 150mg" }], stop_reason: "end_turn" }, calls)
    );
    const { headers } = await createTestUser(app, { name: "Mariana Silva" });
    const res = await app.inject({
      method: "POST",
      url: "/me/chat/messages",
      headers,
      payload: { text: "posso aumentar meu remédio?" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.source).toBe("claude");
    expect(body.crisis).toBe(false);
    expect(body.assistantMessage.text).toBe(`Resposta sobre bupropiona 150mg\n\n${MEDICATION_NOTICE}`);

    // Forma da requisição: modelo, prompt estável cacheado + contexto do usuário, histórico começa por user.
    expect(calls).toHaveLength(1);
    const params = calls[0] as unknown as {
      model: string;
      max_tokens: number;
      system: Array<{ text: string; cache_control?: unknown }>;
      messages: Array<{ role: string; content: string }>;
      output_config: { effort: string };
      betas: string[];
      fallbacks: string;
    };
    expect(params.model).toBe("claude-opus-5-5");
    expect(params.max_tokens).toBe(1024);
    expect(params.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(params.system[1].text).toContain("Mariana");
    expect(params.messages[0]).toEqual({ role: "user", content: "posso aumentar meu remédio?" });
    expect(params.output_config).toEqual({ effort: "low" });
    expect(params.betas).toContain("server-side-fallback-2026-07-01");
    expect(params.fallbacks).toBe("default");

    // Histórico persistido com a fonte.
    const hist = await app.inject({ method: "GET", url: "/me/chat", headers });
    expect(hist.json().messages).toHaveLength(2);
  });

  it("recusa do Claude (stop_reason=refusal) cai para as regras", async () => {
    setLlmClientForTests(fakeClient({ content: [], stop_reason: "refusal", usage: {} }));
    const { headers } = await createTestUser(app);
    const res = await app.inject({ method: "POST", url: "/me/chat/messages", headers, payload: { text: "me sinto ansiosa" } });
    expect(res.statusCode).toBe(200);
    expect(res.json().source).toBe("rules");
    expect(res.json().assistantMessage.text).toContain("4-7-8");
  });

  it("erro do SDK cai para as regras", async () => {
    setLlmClientForTests(fakeClient(new Error("ECONNRESET")));
    const { headers } = await createTestUser(app);
    const res = await app.inject({ method: "POST", url: "/me/chat/messages", headers, payload: { text: "obrigado" } });
    expect(res.statusCode).toBe(200);
    expect(res.json().source).toBe("rules");
    expect(res.json().assistantMessage.text).toContain("Estou aqui sempre que precisar");
  });
});
