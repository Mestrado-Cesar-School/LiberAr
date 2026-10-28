// Assistente LiberAr — rotas do chat (prefixo /me/chat).
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { clearConversation, getOrCreateConversation, listMessages, sendMessage } from "./service";

const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  text: z.string(),
  createdAt: z.string(),
});

export const chatRoutes: FastifyPluginAsync = async (instance) => {
  const app = instance.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["chat"],
        summary: "Histórico da conversa com o assistente",
        security: [{ bearerAuth: [] }],
        response: { 200: z.object({ conversationId: z.string(), messages: z.array(chatMessageSchema) }) },
      },
    },
    async (request) => {
      const conversation = await getOrCreateConversation(request.user.sub);
      return { conversationId: conversation.id, messages: await listMessages(conversation.id) };
    }
  );

  app.post(
    "/messages",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["chat"],
        summary: "Envia uma mensagem e recebe a resposta do assistente",
        security: [{ bearerAuth: [] }],
        body: z.object({ text: z.string().trim().min(1).max(2000) }),
        response: {
          200: z.object({
            userMessage: chatMessageSchema,
            assistantMessage: chatMessageSchema,
            source: z.enum(["claude", "rules", "guardrail"]),
            crisis: z.boolean(),
          }),
        },
      },
    },
    async (request) => sendMessage(request.user.sub, request.body.text, request.log)
  );

  app.delete(
    "/",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["chat"],
        summary: "Apaga o histórico da conversa",
        security: [{ bearerAuth: [] }],
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await clearConversation(request.user.sub);
      return reply.status(204).send(null);
    }
  );
};
