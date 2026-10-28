// Tipos do domínio — cópia fiel de src/core/types.ts do app (formato "wire"
// da API) mais os tipos próprios da API. Manter em sincronia com o app.

export type UsageType = "cigarro" | "vape" | "ambos";
export type SmokeDuration = "lt1" | "1-5" | "5-10" | "gt10";
export type StopReason = "saude" | "familia" | "dinheiro" | "estetica" | "outro";
export type MainFear = "peso" | "ansiedade" | "social" | "abstinencia";
export type StopMethod = "abrupto" | "gradual";
export type AuthMethod = "email" | "google" | "apple";

export type VapeHabits = {
  nicotineMg: number;
  juiceMl: number;
  podDays: number;
  juicePrice: number;
  coilPrice: number;
};

export type UserProfile = {
  name: string;
  email: string;
  authMethod?: AuthMethod;
  avatar?: number;
  quitDate: string;
  cigsPerDay: number;
  packPrice: number;
  cigsPerPack: number;
  usageType?: UsageType;
  vape?: VapeHabits;
  stopMethod?: StopMethod;
  smokeDuration?: SmokeDuration;
  stopReason?: StopReason;
  stopReasonText?: string;
  mainFear?: MainFear;
  mainFearText?: string;
  lastLapseDate?: string;
  reminderEnabled?: boolean;
  reminderHour?: number;
  reminderMinute?: number;
  reminderDays?: number[];
  tourDone?: boolean;
};

/** UserProfile sem a identidade (que vive em User). */
export type UserProfileInput = Omit<UserProfile, "name" | "email" | "authMethod">;

export type Mood = "anxious" | "good" | "hard";

export type CheckIn = {
  date: string;
  mood: Mood | null;
  smoked: boolean;
  cigarettes: number;
  craving: number;
  symptoms?: string[];
};

export type Cycle = {
  id?: string;
  label: string;
  days: number;
  endedAt: string;
};

export type FagerstromResult = {
  score: number;
  label: string;
  date: string;
};

export type Treatment = {
  viaApp: boolean | null;
  ubs: string;
  professional: string;
  startDate: string;
  adesivo: string | null;
  oral: string | null;
  med: string | null;
  adherence: string | null;
  sideEffects: string[];
  notes: string;
};

export type TriggerEntry = {
  id?: string;
  date: string;
  place: string | null;
  emotion: string | null;
  people: string | null;
  intensity: number;
  gaveIn: boolean;
  note: string;
};

export type Progress = {
  days: number;
  hours: number;
  minutes: number;
  totalMinutes: number;
  moneySaved: number;
  cigsAvoided: number;
  dailyCost: number;
  lifeMinutesGained: number;
};

export type Achievement = {
  id: string;
  title: string;
  desc: string;
  thresholdMinutes: number;
  unlocked: boolean;
  progress: number;
};

export type HealthUnit = {
  id: string;
  name: string;
  kind: "UBS" | "CAPS";
  address: string;
  distanceKm: number;
  hours: string;
  phone: string;
  services: string[];
  city?: string | null;
  state?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export const EMPTY_TREATMENT: Treatment = {
  viaApp: null,
  ubs: "",
  professional: "",
  startDate: "",
  adesivo: null,
  oral: null,
  med: null,
  adherence: null,
  sideEffects: [],
  notes: "",
};

// ---- Tipos próprios da API ----

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  avatar?: number;
  authMethod: AuthMethod;
  createdAt: string;
};

export type Snapshot = {
  user: ApiUser;
  profile: UserProfile | null;
  checkIns: CheckIn[];
  cycles: Cycle[];
  fagerstrom: FagerstromResult | null;
  treatment: Treatment;
  triggers: TriggerEntry[];
  progress: Progress | null;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  snapshot: Snapshot;
};

export type ChatRole = "user" | "assistant";
export type ChatSource = "claude" | "rules" | "guardrail";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
};
