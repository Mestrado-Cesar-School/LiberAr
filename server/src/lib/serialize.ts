// Linhas do banco (Prisma) → tipos "wire" do app (src/domain/types.ts).
import type {
  CheckIn as DbCheckIn,
  Cycle as DbCycle,
  FagerstromResult as DbFagerstrom,
  HealthUnit as DbHealthUnit,
  Profile as DbProfile,
  Treatment as DbTreatment,
  TriggerEntry as DbTrigger,
  User as DbUser,
  ChatMessage as DbChatMessage,
} from "@prisma/client";
import {
  ApiUser,
  AuthMethod,
  ChatMessage,
  CheckIn,
  Cycle,
  FagerstromResult,
  HealthUnit,
  Treatment,
  TriggerEntry,
  UserProfile,
  VapeHabits,
} from "../domain/types";

export function serializeUser(u: DbUser): ApiUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatar: u.avatar ?? undefined,
    authMethod: u.authMethod as AuthMethod,
    createdAt: u.createdAt.toISOString(),
  };
}

export function serializeProfile(u: DbUser, p: DbProfile): UserProfile {
  return {
    name: u.name,
    email: u.email,
    authMethod: u.authMethod as AuthMethod,
    avatar: u.avatar ?? undefined,
    quitDate: p.quitDate.toISOString(),
    cigsPerDay: p.cigsPerDay,
    packPrice: p.packPrice,
    cigsPerPack: p.cigsPerPack,
    usageType: p.usageType as UserProfile["usageType"],
    vape: (p.vape as VapeHabits | null) ?? undefined,
    stopMethod: (p.stopMethod as UserProfile["stopMethod"]) ?? undefined,
    smokeDuration: (p.smokeDuration as UserProfile["smokeDuration"]) ?? undefined,
    stopReason: (p.stopReason as UserProfile["stopReason"]) ?? undefined,
    stopReasonText: p.stopReasonText ?? undefined,
    mainFear: (p.mainFear as UserProfile["mainFear"]) ?? undefined,
    mainFearText: p.mainFearText ?? undefined,
    lastLapseDate: p.lastLapseDate?.toISOString() ?? undefined,
    reminderEnabled: p.reminderEnabled,
    reminderHour: p.reminderHour,
    reminderMinute: p.reminderMinute,
    reminderDays: p.reminderDays,
    tourDone: p.tourDone,
  };
}

export function serializeCheckIn(c: DbCheckIn): CheckIn {
  return {
    date: c.date.toISOString(),
    mood: (c.mood as CheckIn["mood"]) ?? null,
    smoked: c.smoked,
    cigarettes: c.cigarettes,
    craving: c.craving,
    symptoms: c.symptoms,
  };
}

export function serializeCycle(c: DbCycle): Cycle {
  return { id: c.id, label: c.label, days: c.days, endedAt: c.endedAt.toISOString() };
}

export function serializeFagerstrom(f: DbFagerstrom): FagerstromResult {
  return { score: f.score, label: f.label, date: f.date };
}

export function serializeTreatment(t: DbTreatment): Treatment {
  return {
    viaApp: t.viaApp,
    ubs: t.ubs,
    professional: t.professional,
    startDate: t.startDate,
    adesivo: t.adesivo,
    oral: t.oral,
    med: t.med,
    adherence: t.adherence,
    sideEffects: t.sideEffects,
    notes: t.notes,
  };
}

export function serializeTrigger(t: DbTrigger): TriggerEntry {
  return {
    id: t.id,
    date: t.date.toISOString(),
    place: t.place,
    emotion: t.emotion,
    people: t.people,
    intensity: t.intensity,
    gaveIn: t.gaveIn,
    note: t.note,
  };
}

export function serializeHealthUnit(h: DbHealthUnit, distanceKm = h.distanceKm): HealthUnit {
  return {
    id: h.id,
    name: h.name,
    kind: h.kind as HealthUnit["kind"],
    address: h.address,
    distanceKm: Math.round(distanceKm * 10) / 10,
    hours: h.hours,
    phone: h.phone,
    services: h.services,
    city: h.city,
    state: h.state,
    lat: h.lat,
    lng: h.lng,
  };
}

export function serializeChatMessage(m: DbChatMessage): ChatMessage {
  return {
    id: m.id,
    role: m.role as ChatMessage["role"],
    text: m.text,
    createdAt: m.createdAt.toISOString(),
  };
}
