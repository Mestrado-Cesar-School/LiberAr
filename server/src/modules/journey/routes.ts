// Jornada: progresso, check-ins, ciclos/recaída, Fagerström, tratamento e
// gatilhos. Registrado em app.ts com prefixo /me. Todas as rotas exigem Bearer.
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  checkInSchema,
  dayKeySchema,
  fagerstromSchema,
  treatmentSchema,
  triggerSchema,
} from "../../domain/schemas";
import { EMPTY_TREATMENT } from "../../domain/types";
import { notFound } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import {
  serializeCheckIn,
  serializeCycle,
  serializeFagerstrom,
  serializeTreatment,
  serializeTrigger,
} from "../../lib/serialize";
import { getProgress, restartStreak } from "./service";

const TAGS = ["journey"];
const SECURITY = [{ bearerAuth: [] }];
const dayParams = z.object({ day: dayKeySchema });

export const journeyRoutes: FastifyPluginAsync = async (instance) => {
  const app = instance.withTypeProvider<ZodTypeProvider>();
  const auth = { preHandler: app.authenticate };

  // ---- Progresso e conquistas (calculados no servidor) ----
  app.get(
    "/progress",
    { ...auth, schema: { tags: TAGS, security: SECURITY, summary: "Progresso e conquistas" } },
    async (request) => getProgress(request.user.sub)
  );

  // ---- Check-ins (um por dia) ----
  app.get(
    "/checkins",
    { ...auth, schema: { tags: TAGS, security: SECURITY, summary: "Lista check-ins (date asc)" } },
    async (request) => {
      const rows = await prisma.checkIn.findMany({
        where: { userId: request.user.sub },
        orderBy: { date: "asc" },
      });
      return rows.map(serializeCheckIn);
    }
  );

  app.put(
    "/checkins/:day",
    {
      ...auth,
      schema: {
        tags: TAGS,
        security: SECURITY,
        summary: "Cria ou substitui o check-in do dia (AAAA-MM-DD)",
        params: dayParams,
        body: checkInSchema,
      },
    },
    async (request) => {
      const userId = request.user.sub;
      const { day } = request.params;
      const b = request.body;
      const data = {
        date: new Date(b.date),
        mood: b.mood,
        smoked: b.smoked,
        cigarettes: b.smoked ? b.cigarettes : 0,
        craving: b.craving,
        symptoms: b.symptoms ?? [],
      };
      const row = await prisma.checkIn.upsert({
        where: { userId_day: { userId, day } },
        create: { userId, day, ...data },
        update: data,
      });
      return serializeCheckIn(row);
    }
  );

  app.delete(
    "/checkins/:day",
    { ...auth, schema: { tags: TAGS, security: SECURITY, summary: "Remove o check-in do dia", params: dayParams } },
    async (request, reply) => {
      const { count } = await prisma.checkIn.deleteMany({
        where: { userId: request.user.sub, day: request.params.day },
      });
      if (count === 0) throw notFound("Check-in");
      return reply.status(204).send();
    }
  );

  // ---- Ciclos e recaída ----
  app.get(
    "/cycles",
    { ...auth, schema: { tags: TAGS, security: SECURITY, summary: "Ciclos encerrados (endedAt asc)" } },
    async (request) => {
      const rows = await prisma.cycle.findMany({
        where: { userId: request.user.sub },
        orderBy: { endedAt: "asc" },
      });
      return rows.map(serializeCycle);
    }
  );

  app.post(
    "/relapse",
    {
      ...auth,
      schema: {
        tags: TAGS,
        security: SECURITY,
        summary: "Reiniciar minha contagem: encerra a sequência atual como um ciclo",
      },
    },
    async (request) => restartStreak(request.user.sub)
  );

  // ---- Fagerström (histórico; devolve o mais recente) ----
  app.get(
    "/fagerstrom",
    { ...auth, schema: { tags: TAGS, security: SECURITY, summary: "Resultado mais recente do Fagerström (ou null)" } },
    async (request, reply) => {
      const row = await prisma.fagerstromResult.findFirst({
        where: { userId: request.user.sub },
        orderBy: { createdAt: "desc" },
      });
      // `null` literal em JSON (reply.send(null) enviaria corpo vazio).
      if (!row) return reply.type("application/json; charset=utf-8").send("null");
      return serializeFagerstrom(row);
    }
  );

  app.put(
    "/fagerstrom",
    { ...auth, schema: { tags: TAGS, security: SECURITY, summary: "Registra um novo resultado do Fagerström", body: fagerstromSchema } },
    async (request) => {
      const row = await prisma.fagerstromResult.create({
        data: { userId: request.user.sub, ...request.body },
      });
      return serializeFagerstrom(row);
    }
  );

  // ---- Tratamento ----
  app.get(
    "/treatment",
    { ...auth, schema: { tags: TAGS, security: SECURITY, summary: "Tratamento em curso (vazio se não houver)" } },
    async (request) => {
      const row = await prisma.treatment.findUnique({ where: { userId: request.user.sub } });
      return row ? serializeTreatment(row) : EMPTY_TREATMENT;
    }
  );

  app.put(
    "/treatment",
    { ...auth, schema: { tags: TAGS, security: SECURITY, summary: "Cria ou substitui o tratamento", body: treatmentSchema } },
    async (request) => {
      const userId = request.user.sub;
      const row = await prisma.treatment.upsert({
        where: { userId },
        create: { userId, ...request.body },
        update: request.body,
      });
      return serializeTreatment(row);
    }
  );

  // ---- Diário de gatilhos ----
  app.get(
    "/triggers",
    { ...auth, schema: { tags: TAGS, security: SECURITY, summary: "Gatilhos registrados (mais recente primeiro)" } },
    async (request) => {
      const rows = await prisma.triggerEntry.findMany({
        where: { userId: request.user.sub },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      });
      return rows.map(serializeTrigger);
    }
  );

  app.post(
    "/triggers",
    { ...auth, schema: { tags: TAGS, security: SECURITY, summary: "Registra um gatilho", body: triggerSchema } },
    async (request, reply) => {
      const b = request.body;
      const row = await prisma.triggerEntry.create({
        data: { userId: request.user.sub, ...b, date: new Date(b.date) },
      });
      return reply.status(201).send(serializeTrigger(row));
    }
  );
};
