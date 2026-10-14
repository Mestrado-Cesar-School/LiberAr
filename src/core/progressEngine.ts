// Motor de Cálculo de Progresso (ver diagrama: Core do Sistema).
// Calcula tempo livre do cigarro, cigarros evitados, dinheiro economizado
// e tempo de vida ganho a partir do Dia D, dos hábitos informados e do
// histórico de check-ins.
//
// Regra de recaída (TCC): o cronômetro mostra a sequência atual — recomeça
// apenas quando o usuário escolhe reiniciar a contagem —, mas a economia é
// medida desde o Dia D, descontando os cigarros fumados. Um lapso não apaga
// a jornada.

import { CheckIn, Progress, UserProfile } from "./types";

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

  return {
    days,
    hours,
    minutes,
    totalMinutes,
    moneySaved,
    cigsAvoided,
    dailyCost: cost,
    lifeMinutesGained,
  };
}

export function formatBRL(value: number): string {
  const [int, dec] = value.toFixed(2).split(".");
  return `R$ ${int.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${dec}`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Chave de dia (AAAA-MM-DD) para comparar datas de check-in. */
export function dayKey(dateIso: string): string {
  const d = new Date(dateIso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function formatDate(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatDateTime(d: Date): string {
  return `${formatDate(d)} às ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export type TimeUnit = { value: number; label: string; pad?: boolean };

/**
 * Unidades do cronômetro da Home: dias/horas/minutos no primeiro mês,
 * depois "meses e dias" e, a partir de um ano, "anos e meses".
 */
export function formatFreeTime(p: Pick<Progress, "days" | "hours" | "minutes">): TimeUnit[] {
  const { days } = p;
  if (days >= 360) {
    const years = Math.floor(days / 360);
    const months = Math.floor((days % 360) / 30);
    return [
      { value: years, label: years === 1 ? "ano" : "anos" },
      { value: months, label: months === 1 ? "mês" : "meses" },
    ];
  }
  if (days >= 30) {
    const months = Math.floor(days / 30);
    const rem = days % 30;
    return [
      { value: months, label: months === 1 ? "mês" : "meses" },
      { value: rem, label: rem === 1 ? "dia" : "dias" },
    ];
  }
  return [
    { value: days, label: days === 1 ? "dia" : "dias" },
    { value: p.hours, label: "hrs", pad: true },
    { value: p.minutes, label: "min", pad: true },
  ];
}

/** Texto curto para o tempo de vida ganho ("3 dias 4h", "45 min"...). */
export function formatLifeGained(lifeMin: number): string {
  if (lifeMin < 60) return `${Math.floor(lifeMin)} min`;
  if (lifeMin < 1440) return `${Math.floor(lifeMin / 60)}h ${Math.floor(lifeMin % 60)}min`;
  const days = Math.floor(lifeMin / 1440);
  const hrs = Math.floor((lifeMin % 1440) / 60);
  if (days < 365) return `${days} ${days === 1 ? "dia" : "dias"} ${hrs}h`;
  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? "ano" : "anos"} ${days % 365}d`;
}
