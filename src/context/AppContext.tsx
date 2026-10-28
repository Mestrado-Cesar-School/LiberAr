// Estado global do aplicativo — faz o papel do Gerenciador de Autenticação
// & LGPD do diagrama: guarda a sessão do usuário, expõe as ações de negócio,
// mantém o cache local (Gerenciador de Sincronização Local) e sincroniza com
// a API (src/data/api.ts + src/data/sync.ts) de forma offline-first:
// cada mutação atualiza o estado e o cache na hora e vai para o servidor em
// seguida; sem rede, fica no outbox e é reenviada depois.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  UserProfileInput,
} from "../core/types";
import { EMPTY_TREATMENT } from "../data/clinical";
import * as api from "../data/api";
import { ApiError, NetworkError, ProfilePatch, Snapshot } from "../data/api";
import * as storage from "../data/storage";
import type { Session } from "../data/storage";
import * as sync from "../data/sync";

export type Credentials = { name: string; email: string; password: string };

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
  /** Sessão autenticada na API (null = sem conta/offline total). */
  session: Session | null;
  /** false depois de uma falha de rede; true após a próxima chamada bem-sucedida. */
  online: boolean;
  /** Operações aguardando reenvio ao servidor. */
  pendingOps: number;
  /**
   * Conclui o onboarding. Com credenciais, cria a conta (POST /auth/register);
   * sem credenciais, exige uma sessão já existente (login social) e grava a
   * jornada em PUT /me/profile.
   */
  completeOnboarding: (profile: UserProfile, credentials?: Credentials) => Promise<void>;
  register: (credentials: Credentials, profile: UserProfileInput) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
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
  /** Puxa o snapshot do servidor (depois de reenviar o outbox). */
  refreshFromServer: () => Promise<void>;
  /** Sair: revoga o refresh token e apaga os dados locais. */
  logout: () => Promise<void>;
  /** LGPD — direito ao esquecimento: apaga a conta no servidor e os dados locais. */
  deleteAccount: () => Promise<void>;
};

const AppContext = createContext<AppState | null>(null);

/** Remove da jornada os campos de identidade (vivem na conta do servidor). */
function toProfileInput(profile: UserProfile): UserProfileInput {
  const { name: _name, email: _email, authMethod: _authMethod, ...rest } = profile;
  return rest;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [fagerstrom, setFagerstrom] = useState<FagerstromResult | null>(null);
  const [treatment, setTreatment] = useState<Treatment>(EMPTY_TREATMENT);
  const [triggers, setTriggers] = useState<TriggerEntry[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [online, setOnline] = useState(true);
  const [pendingOps, setPendingOps] = useState(0);
  const [tick, setTick] = useState(0);

  // Ref para a mutação mais recente do perfil (evita closures velhas em
  // chamadas rápidas em sequência, ex.: dois toggles seguidos).
  const profileRef = useRef<UserProfile | null>(null);
  profileRef.current = profile;

  const resetState = useCallback(() => {
    setProfile(null);
    setCheckIns([]);
    setCycles([]);
    setFagerstrom(null);
    setTreatment(EMPTY_TREATMENT);
    setTriggers([]);
    setPendingOps(0);
  }, []);

  const applySnapshot = useCallback((snap: Snapshot) => {
    setProfile(snap.profile);
    setCheckIns(snap.checkIns);
    setCycles(snap.cycles);
    setFagerstrom(snap.fagerstrom);
    setTreatment(snap.treatment ?? EMPTY_TREATMENT);
    setTriggers(snap.triggers);
  }, []);

  /** Reenvia o outbox e puxa o snapshot. Sem rede, mantém o cache. */
  const syncFromServer = useCallback(async () => {
    if (!api.getSession()) return;
    try {
      await sync.flushOutbox();
      const snap = await sync.pullSnapshot();
      applySnapshot(snap);
    } catch (e) {
      if (e instanceof NetworkError) return; // segue com o cache local
      if (e instanceof ApiError && e.status === 401) return; // sessão expirada (tratada pelo handler)
      console.warn("[sync] falha ao sincronizar", e);
    }
  }, [applySnapshot]);

  // Boot: cache local primeiro (UI imediata), depois o servidor.
  useEffect(() => {
    (async () => {
      let s: Session | null = null;
      let cachedProfile: UserProfile | null = null;
      try {
        const [p, c, cy, f, t, tr, sess, pending] = await Promise.all([
          storage.loadProfile(),
          storage.loadCheckIns(),
          storage.loadCycles(),
          storage.loadFagerstrom(),
          storage.loadTreatment(),
          storage.loadTriggers(),
          storage.loadSession(),
          sync.getPendingCount(),
        ]);
        s = sess;
        cachedProfile = p;
        api.restoreSession(sess);
        setSession(sess);
        setProfile(p);
        setCheckIns(c);
        setCycles(cy);
        setFagerstrom(f);
        setTreatment(t ?? EMPTY_TREATMENT);
        setTriggers(tr);
        setPendingOps(pending);
      } finally {
        // Com sessão mas sem perfil em cache, espera o servidor para não
        // piscar o onboarding antes da Home.
        if (cachedProfile || !s) setLoading(false);
      }
      if (s) {
        await syncFromServer();
        setLoading(false);
      }
    })();
  }, [syncFromServer]);

  // Sessão expirada de vez (refresh falhou): limpa tudo e volta ao início.
  useEffect(() => {
    api.onSessionExpired(() => {
      void storage.clearAll();
      resetState();
    });
    const unsubSession = api.subscribeSession(setSession);
    const unsubOnline = api.subscribeOnline(setOnline);
    const unsubPending = sync.subscribePending(setPendingOps);
    return () => {
      api.onSessionExpired(null);
      unsubSession();
      unsubOnline();
      unsubPending();
    };
  }, [resetState]);

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

  /** Guarda a sessão + snapshot vindos de login/registro. */
  const acceptAuth = useCallback(
    async (res: api.AuthResponse) => {
      await api.applySession({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        userId: res.snapshot.user.id,
      });
      await sync.storeSnapshot(res.snapshot);
      applySnapshot(res.snapshot);
    },
    [applySnapshot]
  );

  const register = useCallback(
    async (credentials: Credentials, profileInput: UserProfileInput) => {
      const res = await api.auth.register({
        name: credentials.name.trim(),
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
        profile: profileInput,
        acceptedTerms: true,
      });
      await acceptAuth(res);
    },
    [acceptAuth]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.auth.login(email.trim().toLowerCase(), password);
      await acceptAuth(res);
    },
    [acceptAuth]
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    await api.auth.forgotPassword(email.trim().toLowerCase());
  }, []);

  const resetPassword = useCallback(async (email: string, code: string, newPassword: string) => {
    await api.auth.resetPassword(email.trim().toLowerCase(), code.trim(), newPassword);
  }, []);

  const completeOnboarding = useCallback(
    async (newProfile: UserProfile, credentials?: Credentials) => {
      if (credentials) {
        await register(credentials, toProfileInput(newProfile));
        return;
      }
      if (!api.getSession()) {
        throw new Error("É preciso criar uma conta para começar a jornada.");
      }
      // Sessão já existe (login social): grava só a jornada.
      setProfile(newProfile);
      await storage.saveProfile(newProfile);
      const r = await sync.pushOp({ kind: "profile.put", payload: toProfileInput(newProfile) });
      if (!r.queued) {
        setProfile(r.result);
        await storage.saveProfile(r.result);
      }
    },
    [register]
  );

  const updateProfile = useCallback(async (patch: Partial<UserProfile>) => {
    const current = profileRef.current;
    if (!current) return;
    // E-mail e método de login são identidade da conta — não mudam por aqui.
    const { email: _email, authMethod: _authMethod, ...safePatch } = patch;
    const next = { ...current, ...safePatch };
    profileRef.current = next;
    setProfile(next);
    await storage.saveProfile(next);
    await sync.pushOp({ kind: "profile.patch", payload: safePatch as ProfilePatch });
  }, []);

  const addCheckIn = useCallback(
    async (checkIn: CheckIn) => {
      // Um check-in por dia: substitui o de hoje, se já existir.
      const day = dayKey(checkIn.date);
      const next = [...checkIns.filter((c) => dayKey(c.date) !== day), checkIn].sort((a, b) =>
        a.date.localeCompare(b.date)
      );
      setCheckIns(next);
      await storage.saveCheckIns(next);
      await sync.pushOp({ kind: "checkin.put", payload: { day, checkIn } });
    },
    [checkIns]
  );

  const restartStreak = useCallback(async () => {
    const current = profileRef.current;
    if (!current || !progress) return;
    const r = await sync.pushOp({ kind: "relapse", payload: {} });
    if (!r.queued) {
      profileRef.current = r.result.profile;
      setProfile(r.result.profile);
      setCycles(r.result.cycles);
      await Promise.all([storage.saveCycles(r.result.cycles), storage.saveProfile(r.result.profile)]);
      return;
    }
    // Sem rede: aplica a regra localmente; o servidor recalcula ao reenviar.
    const cycle: Cycle = {
      label: `Ciclo ${cycles.length + 1}`,
      days: progress.days,
      endedAt: new Date().toISOString(),
    };
    const nextCycles = [...cycles, cycle];
    const nextProfile = { ...current, lastLapseDate: cycle.endedAt };
    profileRef.current = nextProfile;
    setCycles(nextCycles);
    setProfile(nextProfile);
    await Promise.all([storage.saveCycles(nextCycles), storage.saveProfile(nextProfile)]);
  }, [progress, cycles]);

  const saveFagerstromResult = useCallback(async (result: FagerstromResult) => {
    setFagerstrom(result);
    await storage.saveFagerstrom(result);
    await sync.pushOp({ kind: "fagerstrom.put", payload: result });
  }, []);

  const saveTreatmentData = useCallback(async (t: Treatment) => {
    setTreatment(t);
    await storage.saveTreatment(t);
    await sync.pushOp({ kind: "treatment.put", payload: t });
  }, []);

  const addTrigger = useCallback(
    async (entry: TriggerEntry) => {
      const next = [entry, ...triggers];
      setTriggers(next);
      await storage.saveTriggers(next);
      const r = await sync.pushOp({ kind: "trigger.post", payload: entry });
      if (!r.queued) {
        // Guarda o id do servidor no registro recém-criado.
        const withId = [r.result, ...triggers];
        setTriggers(withId);
        await storage.saveTriggers(withId);
      }
    },
    [triggers]
  );

  const refreshFromServer = useCallback(async () => {
    await syncFromServer();
  }, [syncFromServer]);

  const clearLocal = useCallback(async () => {
    await api.applySession(null);
    await storage.clearAll();
    resetState();
  }, [resetState]);

  const logout = useCallback(async () => {
    const s = api.getSession();
    if (s) {
      try {
        await api.auth.logout(s.refreshToken);
      } catch {
        // Melhor esforço: a sessão local é apagada de qualquer jeito.
      }
    }
    await clearLocal();
  }, [clearLocal]);

  const deleteAccount = useCallback(async () => {
    if (api.getSession()) await api.me.delete(); // propaga erros (sem fallback offline)
    await clearLocal();
  }, [clearLocal]);

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
      session,
      online,
      pendingOps,
      completeOnboarding,
      register,
      login,
      requestPasswordReset,
      resetPassword,
      updateProfile,
      addCheckIn,
      restartStreak,
      saveFagerstrom: saveFagerstromResult,
      saveTreatment: saveTreatmentData,
      addTrigger,
      refreshFromServer,
      logout,
      deleteAccount,
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
      session,
      online,
      pendingOps,
      completeOnboarding,
      register,
      login,
      requestPasswordReset,
      resetPassword,
      updateProfile,
      addCheckIn,
      restartStreak,
      saveFagerstromResult,
      saveTreatmentData,
      addTrigger,
      refreshFromServer,
      logout,
      deleteAccount,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve ser usado dentro de <AppProvider>");
  return ctx;
}
