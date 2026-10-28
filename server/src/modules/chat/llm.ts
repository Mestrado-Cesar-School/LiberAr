// Cliente do LLM (Claude) para o assistente. Criado sob demanda e só quando há
// ANTHROPIC_API_KEY. Os testes injetam um cliente falso via setLlmClientForTests.

import Anthropic from "@anthropic-ai/sdk";
import type { FastifyBaseLogger } from "fastify";
import { config, llmEnabled } from "../../config";
import { SYSTEM_PROMPT } from "./prompt";

/** Subconjunto do SDK usado aqui — permite injetar um cliente falso nos testes. */
export type LlmClient = {
  beta: {
    messages: {
      create: (
        params: Anthropic.Beta.Messages.MessageCreateParamsNonStreaming
      ) => Promise<Anthropic.Beta.Messages.BetaMessage>;
    };
  };
};

export type LlmTurn = { role: "user" | "assistant"; text: string };

export type LlmResult =
  | { ok: true; text: string; model: string }
  | { ok: false; reason: "disabled" | "refusal" | "empty" | "error" };

let client: LlmClient | null = null;
let enabledOverride: boolean | null = null;

/** Há LLM disponível? (config, ou override de teste) */
export function isLlmEnabled(): boolean {
  return enabledOverride ?? llmEnabled;
}

/** Injeção para testes: cliente falso + força "habilitado". Passe null para restaurar. */
export function setLlmClientForTests(fake: LlmClient | null, enabled: boolean | null = fake ? true : null) {
  client = fake;
  enabledOverride = enabled;
}

function getClient(): LlmClient {
  if (!client) {
    client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY, timeout: 30_000, maxRetries: 1 });
  }
  return client;
}

/**
 * Converte o histórico em turnos alternados user/assistant, concatenando
 * mensagens consecutivas do mesmo papel (a API exige começar por `user`).
 */
export function toAlternatingMessages(turns: LlmTurn[]): Anthropic.Beta.Messages.BetaMessageParam[] {
  const out: Anthropic.Beta.Messages.BetaMessageParam[] = [];
  for (const t of turns) {
    const text = t.text.trim();
    if (!text) continue;
    const last = out[out.length - 1];
    if (last && last.role === t.role && typeof last.content === "string") {
      last.content = `${last.content}\n\n${text}`;
    } else {
      out.push({ role: t.role, content: text });
    }
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

/** Chama o Claude com o prompt estável (cacheado) + contexto volátil + histórico. */
export async function askClaude(
  userContext: string,
  turns: LlmTurn[],
  log: FastifyBaseLogger
): Promise<LlmResult> {
  if (!isLlmEnabled()) return { ok: false, reason: "disabled" };
  const messages = toAlternatingMessages(turns);
  if (!messages.length) return { ok: false, reason: "empty" };

  try {
    const response = await getClient().beta.messages.create({
      model: config.ANTHROPIC_MODEL,
      max_tokens: 1024, // respostas curtas de chat (2 a 5 frases)
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        { type: "text", text: userContext },
      ],
      messages,
      output_config: { effort: "low" },
      // Fallback server-side: se o modelo recusar por política, a API tenta o
      // modelo substituto padrão na mesma chamada.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });

    const usage = response.usage;
    log.info(
      {
        model: response.model,
        stop_reason: response.stop_reason,
        input_tokens: usage?.input_tokens,
        output_tokens: usage?.output_tokens,
        cache_read_input_tokens: usage?.cache_read_input_tokens ?? 0,
        cache_creation_input_tokens: usage?.cache_creation_input_tokens ?? 0,
      },
      "chat: resposta do Claude"
    );

    if (response.stop_reason === "refusal") {
      log.warn({ stop_details: response.stop_details }, "chat: Claude recusou a resposta — usando regras");
      return { ok: false, reason: "refusal" };
    }
    const text = response.content
      .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!text) return { ok: false, reason: "empty" };
    return { ok: true, text, model: response.model };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      log.warn({ status: err.status }, "chat: limite de requisições do LLM — usando regras");
    } else if (err instanceof Anthropic.APIConnectionError) {
      log.warn({ message: err.message }, "chat: falha de conexão com o LLM — usando regras");
    } else if (err instanceof Anthropic.APIError) {
      log.warn({ status: err.status, message: err.message }, "chat: erro da API do LLM — usando regras");
    } else {
      log.warn({ err }, "chat: erro inesperado no LLM — usando regras");
    }
    return { ok: false, reason: "error" };
  }
}
