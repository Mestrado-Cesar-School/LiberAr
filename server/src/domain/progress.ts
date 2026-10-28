// Motor de Cálculo de Progresso + Validador de Conquistas — cópia do core do
// app (src/core/progressEngine.ts e src/core/achievementRules.ts) para o
// servidor calcular o mesmo resultado a partir do banco. Manter em sincronia.

import { Achievement, CheckIn, Progress, UserProfile } from "./types";

/** Minutos de vida perdidos por cigarro (Shaw et al., BMJ 2000). */
export const LIFE_MINUTES_PER_CIGARETTE = 11;

/** Custo diário do hábito (cigarro e/ou vape) antes de parar. */
export function dailyCost(profile: UserProfile): number {
  const usage = profile.usageType ?? "cigarro";
  let cost = 0;
  if (usage !== "vape") {
    cost += (profile.cigsPerDay * profile.packPrice) / Math.max(1, profile.cigsPerPack);
  }
  if (usage !== "cigarro" && profile.vape) {
    cost += (profile.vape.juicePrice + profile.vape.coilPrice) / Math.max(1, profile.vape.podDays);
  }
  return cost;
}

export function computeProgress(
  profile: UserProfile,
  checkIns: CheckIn[] = [],
  now: Date = new Date()
): Progress {
  const quit = new Date(profile.quitDate);
  const lapse = profile.lastLapseDate ? new Date(profile.lastLapseDate) : null;
  const streakStart = lapse && lapse > quit ? lapse : quit;

  const streakMs = Math.max(0, now.getTime() - streakStart.getTime());
  const totalMinutes = Math.floor(streakMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const daysSinceQuit = Math.max(0, now.getTime() - quit.getTime()) / 86_400_000;
  const smokedTotal = checkIns.reduce((sum, c) => sum + (c.smoked ? c.cigarettes : 0), 0);
  const cigsPerDay = profile.usageType === "vape" ? 0 : profile.cigsPerDay;
  const cigsAvoided = Math.max(0, Math.floor(daysSinceQuit * cigsPerDay) - smokedTotal);
  const pricePerCig = profile.packPrice / Math.max(1, profile.cigsPerPack);
  const cost = dailyCost(profile);
  const moneySaved = Math.max(0, daysSinceQuit * cost - smokedTotal * pricePerCig);
  const lifeMinutesGained = cigsAvoided * LIFE_MINUTES_PER_CIGARETTE;

  return { days, hours, minutes, totalMinutes, moneySaved, cigsAvoided, dailyCost: cost, lifeMinutesGained };
}

const MIN = 1;
const HOUR = 60;
const DAY = 24 * HOUR;

export type MilestoneDef = {
  id: string;
  title: string;
  desc: string;
  thresholdMinutes: number;
  icon: string;
  color: string;
};

export const MILESTONES: MilestoneDef[] = [
  { id: "m20min", title: "20 min", desc: "Frequência cardíaca volta ao normal", thresholdMinutes: 20 * MIN, icon: "activity", color: "#14B8A6" },
  { id: "m8h", title: "8 horas", desc: "Nível de oxigênio no sangue normaliza", thresholdMinutes: 8 * HOUR, icon: "wind", color: "#3B82F6" },
  { id: "m12h", title: "12 horas", desc: "Monóxido de carbono eliminado do corpo", thresholdMinutes: 12 * HOUR, icon: "cloud-off", color: "#06B6D4" },
  { id: "m24h", title: "24 horas", desc: "Risco de infarto começa a cair", thresholdMinutes: DAY, icon: "heart", color: "#F97316" },
  { id: "m48h", title: "48 horas", desc: "Paladar e olfato mais aguçados", thresholdMinutes: 2 * DAY, icon: "coffee", color: "#A855F7" },
  { id: "m72h", title: "72 horas", desc: "Respiração mais fácil, mais energia", thresholdMinutes: 3 * DAY, icon: "feather", color: "#0EA5E9" },
  { id: "m2w", title: "2 semanas", desc: "Circulação e função pulmonar melhoram", thresholdMinutes: 14 * DAY, icon: "trending-up", color: "#22C55E" },
  { id: "m1m", title: "1 mês", desc: "Tosse e falta de ar diminuem", thresholdMinutes: 30 * DAY, icon: "sun", color: "#EAB308" },
  { id: "m3m", title: "3 meses", desc: "Função pulmonar aumenta cerca de 10%", thresholdMinutes: 90 * DAY, icon: "award", color: "#F43F5E" },
  { id: "m9m", title: "9 meses", desc: "Cílios pulmonares regenerados, menos infecções", thresholdMinutes: 270 * DAY, icon: "shield", color: "#8B5CF6" },
  { id: "m1y", title: "1 ano", desc: "Risco de infarto cai pela metade", thresholdMinutes: 365 * DAY, icon: "star", color: "#F59E0B" },
  { id: "m5y", title: "5 anos", desc: "Risco de AVC e de vários cânceres cai pela metade", thresholdMinutes: 5 * 365 * DAY, icon: "zap", color: "#10B981" },
  { id: "m10y", title: "10 anos", desc: "Risco de câncer de pulmão quase pela metade", thresholdMinutes: 10 * 365 * DAY, icon: "gift", color: "#6366F1" },
  { id: "m15y", title: "15 anos", desc: "Risco cardíaco igual ao de quem nunca fumou", thresholdMinutes: 15 * 365 * DAY, icon: "smile", color: "#EC4899" },
];

export type AchievementWithMeta = Achievement & { icon: string; color: string };

export function evaluateAchievements(totalMinutes: number): AchievementWithMeta[] {
  return MILESTONES.map((m) => ({
    id: m.id,
    title: m.title,
    desc: m.desc,
    thresholdMinutes: m.thresholdMinutes,
    unlocked: totalMinutes >= m.thresholdMinutes,
    progress: Math.min(1, totalMinutes / m.thresholdMinutes),
    icon: m.icon,
    color: m.color,
  }));
}

export function nextAchievement(totalMinutes: number): AchievementWithMeta | null {
  return evaluateAchievements(totalMinutes).find((a) => !a.unlocked) ?? null;
}

export function formatBRL(value: number): string {
  const [int, dec] = value.toFixed(2).split(".");
  return `R$ ${int.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${dec}`;
}
