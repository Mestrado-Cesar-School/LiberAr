// Schemas Zod dos payloads da API (compartilhados pelos módulos).
import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

/** Mesma regra do onboarding: 8+ caracteres, 1 letra e 1 número. */
export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .max(128)
  .regex(/[a-zA-Z]/, "A senha deve conter pelo menos uma letra")
  .regex(/[0-9]/, "A senha deve conter pelo menos um número");

export const isoDateSchema = z
  .string()
  .refine((s) => !Number.isNaN(new Date(s).getTime()), "Data inválida (use ISO 8601)");

/** AAAA-MM-DD */
export const dayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD");

export const usageTypeSchema = z.enum(["cigarro", "vape", "ambos"]);
export const smokeDurationSchema = z.enum(["lt1", "1-5", "5-10", "gt10"]);
export const stopReasonSchema = z.enum(["saude", "familia", "dinheiro", "estetica", "outro"]);
export const mainFearSchema = z.enum(["peso", "ansiedade", "social", "abstinencia"]);
export const stopMethodSchema = z.enum(["abrupto", "gradual"]);
export const moodSchema = z.enum(["anxious", "good", "hard"]);

export const vapeHabitsSchema = z.object({
  nicotineMg: z.number().min(0),
  juiceMl: z.number().min(0),
  podDays: z.number().int().min(1),
  juicePrice: z.number().min(0),
  coilPrice: z.number().min(0),
});

/** UserProfileInput — jornada sem a identidade. */
export const profileInputSchema = z.object({
  avatar: z.number().int().min(0).optional(),
  quitDate: isoDateSchema,
  cigsPerDay: z.number().int().min(0).max(200),
  packPrice: z.number().min(0),
  cigsPerPack: z.number().int().min(1).max(100).default(20),
  usageType: usageTypeSchema.optional(),
  vape: vapeHabitsSchema.optional(),
  stopMethod: stopMethodSchema.optional(),
  smokeDuration: smokeDurationSchema.optional(),
  stopReason: stopReasonSchema.optional(),
  stopReasonText: z.string().max(500).optional(),
  mainFear: mainFearSchema.optional(),
  mainFearText: z.string().max(500).optional(),
  lastLapseDate: isoDateSchema.optional(),
  reminderEnabled: z.boolean().optional(),
  reminderHour: z.number().int().min(0).max(23).optional(),
  reminderMinute: z.number().int().min(0).max(59).optional(),
  reminderDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  tourDone: z.boolean().optional(),
});

/** PATCH /me/profile — tudo opcional, mais nome e avatar. */
export const profilePatchSchema = profileInputSchema
  .partial()
  .extend({ name: z.string().trim().min(2).max(80).optional() });

export const checkInSchema = z.object({
  date: isoDateSchema,
  mood: moodSchema.nullable(),
  smoked: z.boolean(),
  cigarettes: z.number().int().min(0).max(500),
  craving: z.number().int().min(0).max(5),
  symptoms: z.array(z.string().max(60)).max(30).optional(),
});

export const fagerstromSchema = z.object({
  score: z.number().int().min(0).max(10),
  label: z.string().min(1).max(40),
  date: z.string().min(1).max(20),
});

export const treatmentSchema = z.object({
  viaApp: z.boolean().nullable(),
  ubs: z.string().max(120),
  professional: z.string().max(120),
  startDate: z.union([z.literal(""), dayKeySchema]),
  adesivo: z.string().max(60).nullable(),
  oral: z.string().max(60).nullable(),
  med: z.string().max(60).nullable(),
  adherence: z.string().max(60).nullable(),
  sideEffects: z.array(z.string().max(60)).max(30),
  notes: z.string().max(2000),
});

export const triggerSchema = z.object({
  date: isoDateSchema,
  place: z.string().max(60).nullable(),
  emotion: z.string().max(60).nullable(),
  people: z.string().max(60).nullable(),
  intensity: z.number().int().min(1).max(5),
  gaveIn: z.boolean(),
  note: z.string().max(1000),
});

export type ProfileInput = z.infer<typeof profileInputSchema>;
export type ProfilePatch = z.infer<typeof profilePatchSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type FagerstromInput = z.infer<typeof fagerstromSchema>;
export type TreatmentInput = z.infer<typeof treatmentSchema>;
export type TriggerInput = z.infer<typeof triggerSchema>;
