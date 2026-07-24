// Gerenciador de Sincronização Local (ver diagrama: Core do Sistema →
// Camada de Dados). Persiste perfil e check-ins no dispositivo via
// AsyncStorage (Local Storage / DB Embarcado). Em produção, este módulo
// também enfileiraria a sincronização com o Banco de Dados na Nuvem.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { CheckIn, UserProfile } from "../core/types";

const KEYS = {
  profile: "@liberar/profile",
  checkIns: "@liberar/checkins",
} as const;

export async function loadProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(KEYS.profile);
  return raw ? (JSON.parse(raw) as UserProfile) : null;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.profile, JSON.stringify(profile));
}

export async function loadCheckIns(): Promise<CheckIn[]> {
  const raw = await AsyncStorage.getItem(KEYS.checkIns);
  return raw ? (JSON.parse(raw) as CheckIn[]) : [];
}

export async function saveCheckIns(checkIns: CheckIn[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.checkIns, JSON.stringify(checkIns));
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.profile, KEYS.checkIns]);
}
