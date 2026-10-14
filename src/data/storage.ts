// Gerenciador de Sincronização Local (ver diagrama: Core do Sistema →
// Camada de Dados). Persiste perfil, check-ins e registros de acompanhamento
// no dispositivo via AsyncStorage (Local Storage / DB Embarcado). Em produção,
// este módulo também enfileiraria a sincronização com o Banco de Dados na Nuvem.

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CheckIn,
  Cycle,
  FagerstromResult,
  Treatment,
  TriggerEntry,
  UserProfile,
} from "../core/types";

const KEYS = {
  profile: "@liberar/profile",
  checkIns: "@liberar/checkins",
  cycles: "@liberar/cycles",
  fagerstrom: "@liberar/fagerstrom",
  treatment: "@liberar/treatment",
  triggers: "@liberar/triggers",
} as const;

async function load<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

async function save<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// Humores gravados por versões anteriores do app.
const LEGACY_MOODS: Record<string, CheckIn["mood"]> = {
  confident: "good",
  stressed: "hard",
};

export const loadProfile = () => load<UserProfile | null>(KEYS.profile, null);
export const saveProfile = (p: UserProfile) => save(KEYS.profile, p);

export async function loadCheckIns(): Promise<CheckIn[]> {
  const list = await load<CheckIn[]>(KEYS.checkIns, []);
  return list.map((c) => (c.mood && LEGACY_MOODS[c.mood] ? { ...c, mood: LEGACY_MOODS[c.mood] } : c));
}
export const saveCheckIns = (c: CheckIn[]) => save(KEYS.checkIns, c);

export const loadCycles = () => load<Cycle[]>(KEYS.cycles, []);
export const saveCycles = (c: Cycle[]) => save(KEYS.cycles, c);

export const loadFagerstrom = () => load<FagerstromResult | null>(KEYS.fagerstrom, null);
export const saveFagerstrom = (r: FagerstromResult) => save(KEYS.fagerstrom, r);

export const loadTreatment = () => load<Treatment | null>(KEYS.treatment, null);
export const saveTreatment = (t: Treatment) => save(KEYS.treatment, t);

export const loadTriggers = () => load<TriggerEntry[]>(KEYS.triggers, []);
export const saveTriggers = (t: TriggerEntry[]) => save(KEYS.triggers, t);

export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
