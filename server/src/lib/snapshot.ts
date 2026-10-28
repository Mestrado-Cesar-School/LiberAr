// Snapshot completo do usuário (resposta de GET /me, login e registro).
import { computeProgress } from "../domain/progress";
import { EMPTY_TREATMENT, Snapshot } from "../domain/types";
import { notFound } from "./errors";
import { prisma } from "./prisma";
import {
  serializeCheckIn,
  serializeCycle,
  serializeFagerstrom,
  serializeProfile,
  serializeTreatment,
  serializeTrigger,
  serializeUser,
} from "./serialize";

export async function buildSnapshot(userId: string): Promise<Snapshot> {
  const [user, profile, checkIns, cycles, fagerstrom, treatment, triggers] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.profile.findUnique({ where: { userId } }),
    prisma.checkIn.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.cycle.findMany({ where: { userId }, orderBy: { endedAt: "asc" } }),
    prisma.fagerstromResult.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.treatment.findUnique({ where: { userId } }),
    prisma.triggerEntry.findMany({ where: { userId }, orderBy: { date: "desc" } }),
  ]);
  if (!user) throw notFound("Usuário");

  const wireProfile = profile ? serializeProfile(user, profile) : null;
  const wireCheckIns = checkIns.map(serializeCheckIn);

  return {
    user: serializeUser(user),
    profile: wireProfile,
    checkIns: wireCheckIns,
    cycles: cycles.map(serializeCycle),
    fagerstrom: fagerstrom ? serializeFagerstrom(fagerstrom) : null,
    treatment: treatment ? serializeTreatment(treatment) : EMPTY_TREATMENT,
    triggers: triggers.map(serializeTrigger),
    progress: wireProfile ? computeProgress(wireProfile, wireCheckIns) : null,
  };
}
