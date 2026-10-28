// Tipos centrais do domínio — compartilhados entre o core, a camada de dados
// e a apresentação (ver diagrama de arquitetura: Core do Sistema).

export type UsageType = "cigarro" | "vape" | "ambos";
export type SmokeDuration = "lt1" | "1-5" | "5-10" | "gt10";
export type StopReason = "saude" | "familia" | "dinheiro" | "estetica" | "outro";
export type MainFear = "peso" | "ansiedade" | "social" | "abstinencia";
export type StopMethod = "abrupto" | "gradual";
export type AuthMethod = "email" | "google" | "apple";

/** Hábitos de quem usa vape (pod/refil), para calcular a economia. */
export type VapeHabits = {
  /** Concentração de nicotina (mg/mL). */
  nicotineMg: number;
  /** Volume do juice (mL). */
  juiceMl: number;
  /** Quantos dias dura um pod/refil. */
  podDays: number;
  juicePrice: number;
  coilPrice: number;
};

export type UserProfile = {
  name: string;
  email: string;
  authMethod?: AuthMethod;
  /** Id do avatar escolhido (i.pravatar.cc). */
  avatar?: number;
  /** Dia D — data em que o usuário parou de fumar (ISO 8601). */
  quitDate: string;
  /** Cigarros fumados por dia antes de parar. */
  cigsPerDay: number;
  /** Preço do maço em reais. */
  packPrice: number;
  /** Cigarros por maço. */
  cigsPerPack: number;
  usageType?: UsageType;
  vape?: VapeHabits;
  stopMethod?: StopMethod;
  // Perguntas motivacionais do onboarding
  smokeDuration?: SmokeDuration;
  stopReason?: StopReason;
  stopReasonText?: string;
  mainFear?: MainFear;
  mainFearText?: string;
  /**
   * Início da sequência atual (ISO 8601). Na TCC, um lapso não é fracasso:
   * só quando o usuário escolhe "Reiniciar minha contagem" a sequência
   * recomeça daqui; a economia acumulada desde o Dia D é preservada.
   */
  lastLapseDate?: string;
  /** Lembrete diário de check-in ativado. */
  reminderEnabled?: boolean;
  /** Hora do lembrete (0-23), padrão 20h. */
  reminderHour?: number;
  /** Minuto do lembrete (0-59), padrão 0. */
  reminderMinute?: number;
  /** Dias da semana do lembrete (0 = domingo), padrão seg-sex. */
  reminderDays?: number[];
  /** Tour de apresentação já foi visto. */
  tourDone?: boolean;
};

/** Jornada sem a identidade (name/email/authMethod vivem na conta do servidor). */
export type UserProfileInput = Omit<UserProfile, "name" | "email" | "authMethod">;

export type Mood = "anxious" | "good" | "hard";

export type CheckIn = {
  /** Data do registro (ISO 8601). */
  date: string;
  mood: Mood | null;
  smoked: boolean;
  cigarettes: number;
  /** Nível de fissura, de 1 a 5 (0 = não informado). */
  craving: number;
  /** Sintomas de abstinência marcados no dia. */
  symptoms?: string[];
};

/** Sequência encerrada quando o usuário escolhe reiniciar a contagem. */
export type Cycle = {
  /** Id no servidor (ausente em registros criados offline). */
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
  /** AAAA-MM-DD */
  startDate: string;
  adesivo: string | null;
  oral: string | null;
  med: string | null;
  adherence: string | null;
  sideEffects: string[];
  notes: string;
};

export type TriggerEntry = {
  /** Id no servidor (ausente em registros criados offline). */
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
  /** Custo diário do hábito, para projeções. */
  dailyCost: number;
  /** Minutos de vida ganhos (11 min por cigarro evitado — BMJ). */
  lifeMinutesGained: number;
};

export type Achievement = {
  id: string;
  title: string;
  desc: string;
  /** Minutos sem fumar necessários para desbloquear. */
  thresholdMinutes: number;
  unlocked: boolean;
  /** Progresso 0..1 em direção ao desbloqueio. */
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
  /** Serviços oferecidos, ex.: grupo de apoio do PNCT. */
  services: string[];
};
