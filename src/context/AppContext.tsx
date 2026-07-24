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
import { CheckIn, Progress, UserProfile } from "../core/types";
import * as storage from "../data/storage";

type AppState = {
  loading: boolean;
  profile: UserProfile | null;
  checkIns: CheckIn[];
  progress: Progress | null;
  /** Check-in registrado hoje, se houver (usado para editar em vez de duplicar). */
  todaysCheckIn: CheckIn | null;
  completeOnboarding: (profile: UserProfile) => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  addCheckIn: (checkIn: CheckIn) => Promise<void>;
  logout: () => Promise<void>;
};

const AppContext = createContext<AppState | null>(null);

/** Data do lapso mais recente (check-in com recaída), ou undefined. */
function mostRecentLapse(checkIns: CheckIn[]): string | undefined {
  const smoked = checkIns
    .filter((c) => c.smoked)
    .map((c) => c.date)
    .sort();
  return smoked.length ? smoked[smoked.length - 1] : undefined;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [storedProfile, storedCheckIns] = await Promise.all([
          storage.loadProfile(),
          storage.loadCheckIns(),
        ]);
        setProfile(storedProfile);
        setCheckIns(storedCheckIns);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Reavalia o cronômetro a cada minuto para o dashboard ficar vivo.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
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

      // Regra de recaída (TCC): a sequência do cronômetro recomeça no lapso
      // mais recente. Recalcular a cada check-in mantém a regra consistente
      // mesmo quando o usuário corrige o registro do dia.
      if (profile) {
        const lapse = mostRecentLapse(next);
        if (lapse !== profile.lastLapseDate) {
          const updated = { ...profile, lastLapseDate: lapse };
          setProfile(updated);
          await storage.saveProfile(updated);
        }
      }
    },
    [checkIns, profile]
  );

  const logout = useCallback(async () => {
    await storage.clearAll();
    setProfile(null);
    setCheckIns([]);
  }, []);

  const value = useMemo(
    () => ({
      loading,
      profile,
      checkIns,
      progress,
      todaysCheckIn,
      completeOnboarding,
      updateProfile,
      addCheckIn,
      logout,
    }),
    [
      loading,
      profile,
      checkIns,
      progress,
      todaysCheckIn,
      completeOnboarding,
      updateProfile,
      addCheckIn,
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
