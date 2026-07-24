// Validador de Regras de Conquistas (ver diagrama: Core do Sistema).
// Marcos de recuperação da saúde após parar de fumar, baseados em
// literatura do PNCT/OMS. Cada badge desbloqueia por tempo real sem fumar.

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
  { id: "m20min", title: "20 min", desc: "Pressão e batimentos normalizam", thresholdMinutes: 20 * MIN, icon: "activity", color: "#14B8A6" },
  { id: "m8h", title: "8 horas", desc: "Nível de oxigênio normalizado", thresholdMinutes: 8 * HOUR, icon: "wind", color: "#3B82F6" },
  { id: "m24h", title: "24 horas", desc: "Risco de infarto começa a cair", thresholdMinutes: DAY, icon: "heart", color: "#F97316" },
  { id: "m48h", title: "48 horas", desc: "Paladar e olfato apurados", thresholdMinutes: 2 * DAY, icon: "coffee", color: "#A855F7" },
  { id: "m72h", title: "72 horas", desc: "Respirar fica mais fácil", thresholdMinutes: 3 * DAY, icon: "feather", color: "#0EA5E9" },
  { id: "m2w", title: "2 semanas", desc: "Circulação sanguínea melhora", thresholdMinutes: 14 * DAY, icon: "trending-up", color: "#22C55E" },
  { id: "m1m", title: "1 mês", desc: "Menos tosse e mais energia", thresholdMinutes: 30 * DAY, icon: "sun", color: "#EAB308" },
  { id: "m3m", title: "3 meses", desc: "Função pulmonar até 30% melhor", thresholdMinutes: 90 * DAY, icon: "award", color: "#F43F5E" },
  { id: "m6m", title: "6 meses", desc: "Menos infecções respiratórias", thresholdMinutes: 180 * DAY, icon: "shield", color: "#8B5CF6" },
  { id: "m1y", title: "1 ano", desc: "Risco cardíaco cai pela metade", thresholdMinutes: 365 * DAY, icon: "star", color: "#F59E0B" },
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
