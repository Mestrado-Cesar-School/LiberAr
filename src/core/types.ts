// Tipos centrais do domínio — compartilhados entre o core, a camada de dados
// e a apresentação (ver diagrama de arquitetura: Core do Sistema).

export type UserProfile = {
  name: string;
  email: string;
  /** Dia D — data em que o usuário parou de fumar (ISO 8601). */
  quitDate: string;
  /** Cigarros fumados por dia antes de parar. */
  cigsPerDay: number;
  /** Preço do maço em reais. */
  packPrice: number;
  /** Cigarros por maço. */
  cigsPerPack: number;
  /**
   * Último lapso registrado (ISO 8601). Na TCC, um lapso não é fracasso:
   * a sequência recomeça a contar daqui, mas a economia acumulada desde o
   * Dia D é preservada (descontados os cigarros fumados).
   */
  lastLapseDate?: string;
  /** Lembrete diário de check-in ativado. */
  reminderEnabled?: boolean;
  /** Hora do lembrete (0-23), padrão 20h. */
  reminderHour?: number;
};

export type Mood = "anxious" | "confident" | "stressed";

export type CheckIn = {
  /** Data do registro (ISO 8601). */
  date: string;
  mood: Mood | null;
  smoked: boolean;
  cigarettes: number;
  /** Nível de fissura, de 1 a 5. */
  craving: number;
};

export type Progress = {
  days: number;
  hours: number;
  minutes: number;
  totalMinutes: number;
  moneySaved: number;
  cigsAvoided: number;
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
