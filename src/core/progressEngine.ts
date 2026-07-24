// Motor de Cálculo de Progresso (ver diagrama: Core do Sistema).
// Calcula tempo livre do cigarro, cigarros evitados e dinheiro economizado
// a partir do Dia D, dos hábitos informados e do histórico de check-ins.
//
// Regra de recaída (TCC): o cronômetro mostra a sequência atual — recomeça
// no último lapso registrado —, mas a economia é medida desde o Dia D,
// descontando os cigarros fumados. Um lapso não apaga a jornada.

import { CheckIn, Progress, UserProfile } from "./types";

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
  const cigsAvoided = Math.max(0, Math.floor(daysSinceQuit * profile.cigsPerDay) - smokedTotal);
  const pricePerCig = profile.packPrice / Math.max(1, profile.cigsPerPack);
  const moneySaved = cigsAvoided * pricePerCig;

  return { days, hours, minutes, totalMinutes, moneySaved, cigsAvoided };
}

export function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Chave de dia (AAAA-MM-DD) para comparar datas de check-in. */
export function dayKey(dateIso: string): string {
  const d = new Date(dateIso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
