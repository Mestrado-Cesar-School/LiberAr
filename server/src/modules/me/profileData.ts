// ProfileInput / ProfilePatch (zod) → dados do Prisma. Identidade (name,
// avatar) vai para User; a jornada vai para Profile (vape como Json).
import { Prisma } from "@prisma/client";
import type { ProfileInput, ProfilePatch } from "../../domain/schemas";

type ProfileData = Omit<Prisma.ProfileUncheckedCreateInput, "userId" | "createdAt" | "updatedAt">;

/** PUT: substitui a jornada inteira (campos omitidos voltam ao padrão). */
export function fullProfileData(input: ProfileInput): ProfileData {
  return {
    quitDate: new Date(input.quitDate),
    cigsPerDay: input.cigsPerDay,
    packPrice: input.packPrice,
    cigsPerPack: input.cigsPerPack ?? 20,
    usageType: input.usageType ?? "cigarro",
    vape: input.vape ?? Prisma.DbNull,
    stopMethod: input.stopMethod ?? null,
    smokeDuration: input.smokeDuration ?? null,
    stopReason: input.stopReason ?? null,
    stopReasonText: input.stopReasonText ?? null,
    mainFear: input.mainFear ?? null,
    mainFearText: input.mainFearText ?? null,
    lastLapseDate: input.lastLapseDate ? new Date(input.lastLapseDate) : null,
    reminderEnabled: input.reminderEnabled ?? false,
    reminderHour: input.reminderHour ?? 20,
    reminderMinute: input.reminderMinute ?? 0,
    reminderDays: input.reminderDays ?? [1, 2, 3, 4, 5],
    tourDone: input.tourDone ?? false,
  };
}

/** PATCH: só os campos enviados. */
export function patchProfileData(patch: ProfilePatch): Prisma.ProfileUncheckedUpdateInput {
  const d: Prisma.ProfileUncheckedUpdateInput = {};
  if (patch.quitDate !== undefined) d.quitDate = new Date(patch.quitDate);
  if (patch.cigsPerDay !== undefined) d.cigsPerDay = patch.cigsPerDay;
  if (patch.packPrice !== undefined) d.packPrice = patch.packPrice;
  if (patch.cigsPerPack !== undefined) d.cigsPerPack = patch.cigsPerPack;
  if (patch.usageType !== undefined) d.usageType = patch.usageType;
  if (patch.vape !== undefined) d.vape = patch.vape;
  if (patch.stopMethod !== undefined) d.stopMethod = patch.stopMethod;
  if (patch.smokeDuration !== undefined) d.smokeDuration = patch.smokeDuration;
  if (patch.stopReason !== undefined) d.stopReason = patch.stopReason;
  if (patch.stopReasonText !== undefined) d.stopReasonText = patch.stopReasonText;
  if (patch.mainFear !== undefined) d.mainFear = patch.mainFear;
  if (patch.mainFearText !== undefined) d.mainFearText = patch.mainFearText;
  if (patch.lastLapseDate !== undefined) d.lastLapseDate = new Date(patch.lastLapseDate);
  if (patch.reminderEnabled !== undefined) d.reminderEnabled = patch.reminderEnabled;
  if (patch.reminderHour !== undefined) d.reminderHour = patch.reminderHour;
  if (patch.reminderMinute !== undefined) d.reminderMinute = patch.reminderMinute;
  if (patch.reminderDays !== undefined) d.reminderDays = patch.reminderDays;
  if (patch.tourDone !== undefined) d.tourDone = patch.tourDone;
  return d;
}

/** Campos do PATCH que pertencem à conta (User). */
export function patchUserData(patch: ProfilePatch): Prisma.UserUpdateInput {
  const d: Prisma.UserUpdateInput = {};
  if (patch.name !== undefined) d.name = patch.name;
  if (patch.avatar !== undefined) d.avatar = patch.avatar;
  return d;
}

export const hasKeys = (o: object) => Object.keys(o).length > 0;
