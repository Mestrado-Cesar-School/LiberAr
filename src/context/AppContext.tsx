// Estado global do aplicativo — faz o papel do Gerenciador de Autenticação
// & LGPD do diagrama: guarda a sessão do usuário, expõe as ações de negócio
// e delega a persistência ao Gerenciador de Sincronização Local.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { computeProgress, dayKey } from "../core/progressEngine";
import {
  CheckIn,
  Cycle,
  FagerstromResult,
  Progress,
  Treatment,
  TriggerEntry,
  UserProfile,
} from "../core/types";
import { EMPTY_TREATMENT } from "../data/clinical";
import * as storage from "../data/storage";

type AppState = {
  loading: boolean;
  profile: UserProfile | null;
  checkIns: CheckIn[];
  cycles: Cycle[];
  fagerstrom: FagerstromResult | null;
  treatment: Treatment;
  triggers: TriggerEntry[];
  progress: Progress | null;
  /** Check-in registrado hoje, se houver (usado para editar em vez de duplicar). */
  todaysCheckIn: CheckIn | null;
  completeOnboarding: (profile: UserProfile) => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  addCheckIn: (checkIn: CheckIn) => Promise<void>;
  /**
   * Recaída — "Reiniciar minha contagem": encerra a sequência atual como um
   * ciclo no histórico e recomeça o cronômetro agora.
   */
  restartStreak: () => Promise<void>;
  saveFagerstrom: (result: FagerstromResult) => Promise<void>;
  saveTreatment: (treatment: Treatment) => Promise<void>;
  addTrigger: (entry: TriggerEntry) => Promise<void>;
  logout: () => Promise<void>;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [fagerstrom, setFagerstrom] = useState<FagerstromResult | null>(null);
  const [treatment, setTreatment] = useState<Treatment>(EMPTY_TREATMENT);
  const [triggers, setTriggers] = useState<TriggerEntry[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [p, c, cy, f, t, tr] = await Promise.all([
          storage.loadProfile(),
          storage.loadCheckIns(),
          storage.loadCycles(),
          storage.loadFagerstrom(),
          storage.loadTreatment(),
          storage.loadTriggers(),
        ]);
        setProfile(p);
        setCheckIns(c);
        setCycles(cy);
        setFagerstrom(f);
        setTreatment(t ?? EMPTY_TREATMENT);
        setTriggers(tr);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Reavalia o cronômetro a cada 30s para o dashboard ficar vivo.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const progress = useMemo(
    () => (profile ? computeProgress(profile, checkIns) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, checkIns, tick]
  );

  const todaysCheckIn = useMemo(() => {
    const today = dayKey(new Date().toISOString());
    return checkIns.find((c) => dayKey(c.date) === today) ?? null;
  }, [checkIns]);

  const completeOnboarding = useCallback(async (newProfile: UserProfile) => {
    setProfile(newProfile);
    await storage.saveProfile(newProfile);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      if (!profile) return;
      const next = { ...profile, ...patch };
      setProfile(next);
      await storage.saveProfile(next);
    },
    [profile]
  );

  const addCheckIn = useCallback(
    async (checkIn: CheckIn) => {
      // Um check-in por dia: substitui o de hoje, se já existir.
      const today = dayKey(checkIn.date);
      const next = [...checkIns.filter((c) => dayKey(c.date) !== today), checkIn].sort(
        (a, b) => a.date.localeCompare(b.date)
      );
      setCheckIns(next);
      await storage.saveCheckIns(next);
    },
    [checkIns]
  );

  const restartStreak = useCallback(async () => {
    if (!profile || !progress) return;
    const cycle: Cycle = {
      label: `Ciclo ${cycles.length + 1}`,
      days: progress.days,
      endedAt: new Date().toISOString(),
    };
    const nextCycles = [...cycles, cycle];
    const nextProfile = { ...profile, lastLapseDate: cycle.endedAt };
    setCycles(nextCycles);
    setProfile(nextProfile);
    await Promise.all([storage.saveCycles(nextCycles), storage.saveProfile(nextProfile)]);
  }, [profile, progress, cycles]);

  const saveFagerstromResult = useCallback(async (result: FagerstromResult) => {
    setFagerstrom(result);
    await storage.saveFagerstrom(result);
  }, []);

  const saveTreatmentData = useCallback(async (t: Treatment) => {
    setTreatment(t);
    await storage.saveTreatment(t);
  }, []);

  const addTrigger = useCallback(
    async (entry: TriggerEntry) => {
      const next = [entry, ...triggers];
      setTriggers(next);
      await storage.saveTriggers(next);
    },
    [triggers]
  );

  const logout = useCallback(async () => {
    await storage.clearAll();
    setProfile(null);
    setCheckIns([]);
    setCycles([]);
    setFagerstrom(null);
    setTreatment(EMPTY_TREATMENT);
    setTriggers([]);
  }, []);

  const value = useMemo(
    () => ({
      loading,
      profile,
      checkIns,
      cycles,
      fagerstrom,
      treatment,
      triggers,
      progress,
      todaysCheckIn,
      completeOnboarding,
      updateProfile,
      addCheckIn,
      restartStreak,
      saveFagerstrom: saveFagerstromResult,
      saveTreatment: saveTreatmentData,
      addTrigger,
      logout,
    }),
    [
      loading,
      profile,
      checkIns,
      cycles,
      fagerstrom,
      treatment,
      triggers,
      progress,
      todaysCheckIn,
      completeOnboarding,
      updateProfile,
      addCheckIn,
      restartStreak,
      saveFagerstromResult,
      saveTreatmentData,
      addTrigger,
      logout,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve ser usado dentro de <AppProvider>");
  return ctx;
}
