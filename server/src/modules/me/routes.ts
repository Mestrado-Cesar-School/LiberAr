// Conta e perfil: GET /me, PUT|PATCH /me/profile, GET /me/export, DELETE /me.
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { profileInputSchema, profilePatchSchema } from "../../domain/schemas";
import { notFound } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import {
  serializeCheckIn,
  serializeCycle,
  serializeFagerstrom,
  serializeProfile,
  serializeTreatment,
  serializeTrigger,
} from "../../lib/serialize";
import { buildSnapshot } from "../../lib/snapshot";
import { revokeAllRefreshTokens } from "../auth/tokens";
import { fullProfileData, hasKeys, patchProfileData, patchUserData } from "./profileData";

const protectedSchema = { tags: ["me"], security: [{ bearerAuth: [] }] };

export const meRoutes: FastifyPluginAsync = async (instance) => {
  const app = instance.withTypeProvider<ZodTypeProvider>();

  app.get("/", { preHandler: app.authenticate, schema: { ...protectedSchema } }, async (request) =>
    buildSnapshot(request.user.sub)
  );

  app.put(
    "/profile",
    { preHandler: app.authenticate, schema: { ...protectedSchema, body: profileInputSchema } },
    async (request) => {
      const userId = request.user.sub;
      const data = fullProfileData(request.body);
      const [user, profile] = await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: request.body.avatar !== undefined ? { avatar: request.body.avatar } : {},
        }),
        prisma.profile.upsert({ where: { userId }, create: { userId, ...data }, update: data }),
      ]);
      return serializeProfile(user, profile);
    }
  );

  app.patch(
    "/profile",
    { preHandler: app.authenticate, schema: { ...protectedSchema, body: profilePatchSchema } },
    async (request) => {
      const userId = request.user.sub;
      const userData = patchUserData(request.body);
      const profileData = patchProfileData(request.body);

      const existing = await prisma.profile.findUnique({ where: { userId } });
      if (!existing) throw notFound("Perfil");

      const [user, profile] = await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: userData }),
        hasKeys(profileData)
          ? prisma.profile.update({ where: { userId }, data: profileData })
          : prisma.profile.findUniqueOrThrow({ where: { userId } }),
      ]);
      return serializeProfile(user, profile);
    }
  );

  // Portabilidade (LGPD): todos os dados do usuário em JSON.
  app.get("/export", { preHandler: app.authenticate, schema: { ...protectedSchema } }, async (request, reply) => {
    const userId = request.user.sub;
    const [user, profile, checkIns, cycles, fagerstrom, treatment, triggers, conversations] =
      await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.profile.findUnique({ where: { userId } }),
        prisma.checkIn.findMany({ where: { userId }, orderBy: { date: "asc" } }),
        prisma.cycle.findMany({ where: { userId }, orderBy: { endedAt: "asc" } }),
        prisma.fagerstromResult.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        prisma.treatment.findUnique({ where: { userId } }),
        prisma.triggerEntry.findMany({ where: { userId }, orderBy: { date: "desc" } }),
        prisma.conversation.findMany({
          where: { userId },
          orderBy: { createdAt: "asc" },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        }),
      ]);
    if (!user) throw notFound("Usuário");

    reply.header("content-disposition", 'attachment; filename="liberar-meus-dados.json"');
    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        authMethod: user.authMethod,
        termsAcceptedAt: user.termsAcceptedAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
      },
      profile: profile ? serializeProfile(user, profile) : null,
      checkIns: checkIns.map(serializeCheckIn),
      cycles: cycles.map(serializeCycle),
      fagerstrom: fagerstrom.map((f) => ({ ...serializeFagerstrom(f), createdAt: f.createdAt.toISOString() })),
      treatment: treatment ? serializeTreatment(treatment) : null,
      triggers: triggers.map(serializeTrigger),
      conversations: conversations.map((c) => ({
        id: c.id,
        createdAt: c.createdAt.toISOString(),
        messages: c.messages.map((m) => ({
          id: m.id,
          role: m.role,
          text: m.text,
          source: m.source,
          createdAt: m.createdAt.toISOString(),
        })),
      })),
    };
  });

  // Direito ao esquecimento (LGPD): apaga a conta e tudo em cascata.
  app.delete("/", { preHandler: app.authenticate, schema: { ...protectedSchema } }, async (request, reply) => {
    const userId = request.user.sub;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound("Usuário");
    await revokeAllRefreshTokens(userId);
    await prisma.user.delete({ where: { id: userId } });
    return reply.code(204).send();
  });
};
