// Validador de Regras de Conquistas (ver diagrama: Core do Sistema).
// Marcos de recuperação da saúde após parar de fumar, baseados em
// literatura do INCA/OMS. Cada badge desbloqueia por tempo real sem fumar.

import { Achievement } from "./types";

const MIN = 1;
const HOUR = 60;
const DAY = 24 * HOUR;

type MilestoneDef = {
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

/** Próxima conquista ainda bloqueada, para destacar no dashboard. */
export function nextAchievement(totalMinutes: number): AchievementWithMeta | null {
  return evaluateAchievements(totalMinutes).find((a) => !a.unlocked) ?? null;
}

/**
 * Progresso (0..1) da próxima conquista contado a partir da anterior, para a
 * barra da Home não ficar "parada" em marcos longos.
 */
export function progressTowardNext(totalMinutes: number): number {
  const idx = MILESTONES.findIndex((m) => totalMinutes < m.thresholdMinutes);
  if (idx < 0) return 1;
  const prev = idx > 0 ? MILESTONES[idx - 1].thresholdMinutes : 0;
  const next = MILESTONES[idx].thresholdMinutes;
  return Math.max(0.02, Math.min(0.99, (totalMinutes - prev) / (next - prev)));
}
