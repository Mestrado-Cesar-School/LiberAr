// Regras da jornada: progresso calculado no servidor e recaída (reinício da
// contagem) em transação. Ver docs/backend-architecture.md (seção 5).
import type { Prisma } from "@prisma/client";
import { computeProgress, evaluateAchievements } from "../../domain/progress";
import type { Cycle, UserProfile } from "../../domain/types";
import { notFound } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { serializeCheckIn, serializeCycle, serializeProfile } from "../../lib/serialize";

type Db = Prisma.TransactionClient | typeof prisma;

/** Perfil (wire) + check-ins do usuário; 404 quando a jornada não foi criada. */
async function loadJourney(db: Db, userId: string, now: Date) {
  const [user, checkIns] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, include: { profile: true } }),
    db.checkIn.findMany({ where: { userId }, orderBy: { date: "asc" } }),
  ]);
  if (!user || !user.profile) throw notFound("Perfil");
  const profile = serializeProfile(user, user.profile);
  const progress = computeProgress(profile, checkIns.map(serializeCheckIn), now);
  return { user, profile, progress };
}

export async function getProgress(userId: string, now = new Date()) {
  const { progress } = await loadJourney(prisma, userId, now);
  return { progress, achievements: evaluateAchievements(progress.totalMinutes) };
}

/**
 * "Reiniciar minha contagem": encerra a sequência atual como `Ciclo N`
 * (dias calculados aqui, não confiados ao cliente) e marca lastLapseDate.
 * A economia desde o Dia D é preservada pelo motor de progresso.
 */
export async function restartStreak(
  userId: string,
  now = new Date()
): Promise<{ profile: UserProfile; cycles: Cycle[] }> {
  return prisma.$transaction(async (tx) => {
    const { user, progress } = await loadJourney(tx, userId, now);
    const count = await tx.cycle.count({ where: { userId } });
    await tx.cycle.create({
      data: { userId, label: `Ciclo ${count + 1}`, days: progress.days, endedAt: now },
    });
    const updated = await tx.profile.update({ where: { userId }, data: { lastLapseDate: now } });
    const cycles = await tx.cycle.findMany({ where: { userId }, orderBy: { endedAt: "asc" } });
    return { profile: serializeProfile(user, updated), cycles: cycles.map(serializeCycle) };
  });
}
