// Orquestra o pipeline do assistente (docs/backend-architecture.md, seção 5):
// 1 guardrail de crise → 2 contexto → 3 Claude → 4 pós-filtro → 5 fallback.

import type { FastifyBaseLogger } from "fastify";
import { ChatMessage, ChatSource } from "../../domain/types";
import { prisma } from "../../lib/prisma";
import { serializeChatMessage } from "../../lib/serialize";
import { buildSnapshot } from "../../lib/snapshot";
import { CRISIS_REPLY, detectCrisis, medicationNotice } from "./guardrails";
import { askClaude, LlmTurn } from "./llm";
import { buildUserContext } from "./prompt";
import { generateReply } from "./rules";

const HISTORY_LIMIT = 20;

/** Conversa ativa (a mais recente) do usuário; cria uma vazia se não houver. */
export async function getOrCreateConversation(userId: string) {
  const existing = await prisma.conversation.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;
  return prisma.conversation.create({ data: { userId } });
}

export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  const rows = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(serializeChatMessage);
}

export async function clearConversation(userId: string): Promise<void> {
  await prisma.conversation.deleteMany({ where: { userId } });
}

export type SendResult = {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  source: ChatSource;
  crisis: boolean;
};

export async function sendMessage(userId: string, text: string, log: FastifyBaseLogger): Promise<SendResult> {
  const conversation = await getOrCreateConversation(userId);
  const userMessage = await prisma.chatMessage.create({
    data: { conversationId: conversation.id, role: "user", text },
  });

  const { reply, source, crisis } = await produceReply(userId, conversation.id, text, log);

  const assistantMessage = await prisma.chatMessage.create({
    data: { conversationId: conversation.id, role: "assistant", text: reply, source },
  });
  await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

  return {
    userMessage: serializeChatMessage(userMessage),
    assistantMessage: serializeChatMessage(assistantMessage),
    source,
    crisis,
  };
}

async function produceReply(
  userId: string,
  conversationId: string,
  text: string,
  log: FastifyBaseLogger
): Promise<{ reply: string; source: ChatSource; crisis: boolean }> {
  // 1. Guardrail de crise — nunca passa pelo LLM.
  if (detectCrisis(text)) {
    log.info({ userId }, "chat: guardrail de crise acionado");
    return { reply: CRISIS_REPLY, source: "guardrail", crisis: true };
  }

  // 2. Contexto: perfil + progresso (servidor) + últimas mensagens.
  const snapshot = await buildSnapshot(userId);
  const ctx = snapshot.profile && snapshot.progress ? { profile: snapshot.profile, progress: snapshot.progress } : null;

  // A mensagem atual já foi persistida: o histórico recente a inclui no fim.
  const history = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });
  const turns: LlmTurn[] = history
    .reverse()
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", text: m.text }));

  // 3. Claude (4. pós-filtro de medicamentos).
  const llm = await askClaude(buildUserContext({ profile: snapshot.profile, progress: snapshot.progress }), turns, log);
  if (llm.ok) {
    return { reply: medicationNotice(llm.text), source: "claude", crisis: false };
  }

  // 5. Fallback: motor de regras local.
  return { reply: generateReply(text, ctx), source: "rules", crisis: false };
}
