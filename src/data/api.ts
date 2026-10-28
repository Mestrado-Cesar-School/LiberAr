// Cliente HTTP da API do LiberAr (server/). Contrato em docs/backend-architecture.md.
//
// - Base URL: EXPO_PUBLIC_API_URL ou o localhost da plataforma.
// - Injeta o Bearer da sessão, renova o access token em 401 (uma vez, com a
//   renovação concorrente serializada) e avisa o AppContext quando a sessão
//   expira de vez.
// - Erros HTTP viram ApiError { status, code }; falhas de rede/timeout viram
//   NetworkError — é essa distinção que o sync.ts usa para enfileirar no outbox.

import { Platform } from "react-native";
import {
  CheckIn,
  Cycle,
  FagerstromResult,
  HealthUnit,
  Progress,
  Treatment,
  TriggerEntry,
  UserProfile,
  UserProfileInput,
} from "../core/types";
import * as storage from "./storage";
import type { Session } from "./storage";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000");

const TIMEOUT_MS = 15_000;

// ---- Tipos de resposta (seção 4 do contrato) ----

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  avatar?: number;
  authMethod: "email" | "google" | "apple";
  createdAt: string;
};

export type Snapshot = {
  user: ApiUser;
  profile: UserProfile | null;
  checkIns: CheckIn[];
  cycles: Cycle[];
  fagerstrom: FagerstromResult | null;
  treatment: Treatment;
  triggers: TriggerEntry[];
  progress: Progress | null;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  snapshot: Snapshot;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};

export type ChatSource = "claude" | "rules" | "guardrail";

export type ChatReply = {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  source: ChatSource;
  crisis: boolean;
};

export type ProfilePatch = Partial<UserProfileInput> & { name?: string; avatar?: number };

// ---- Erros ----

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "INVALID_CREDENTIALS"
  | "INVALID_CODE"
  | "EMAIL_TAKEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "LLM_UNAVAILABLE"
  | "INTERNAL_ERROR"
  | (string & {});

/** Resposta HTTP de erro no formato { error: { code, message, details } }. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Sem rede, servidor fora do ar ou timeout. */
export class NetworkError extends Error {
  constructor(message = "Sem conexão com o servidor") {
    super(message);
    this.name = "NetworkError";
  }
}

/** Mensagem amigável (PT-BR) para exibir nas telas. */
export function describeError(error: unknown): string {
  if (error instanceof NetworkError) return "Sem conexão com o servidor";
  if (error instanceof ApiError) {
    switch (error.code) {
      case "INVALID_CREDENTIALS":
        return "E-mail ou senha incorretos";
      case "EMAIL_TAKEN":
        return "Este e-mail já está cadastrado";
      case "INVALID_CODE":
        return "Código inválido, expirado ou com tentativas esgotadas";
      case "RATE_LIMITED":
        return "Muitas tentativas. Aguarde um instante e tente de novo.";
      case "UNAUTHORIZED":
        return "Sua sessão expirou. Entre novamente.";
      case "VALIDATION_ERROR":
        return error.message || "Dados inválidos";
      default:
        return error.message || "Algo deu errado. Tente novamente.";
    }
  }
  return "Algo deu errado. Tente novamente.";
}

// ---- Sessão em memória (espelho do AsyncStorage) ----

let currentSession: Session | null = null;
const sessionListeners = new Set<(s: Session | null) => void>();
let sessionExpiredHandler: (() => void) | null = null;

export function getSession(): Session | null {
  return currentSession;
}

/** Restaura a sessão lida do storage no boot (sem regravar). */
export function restoreSession(s: Session | null): void {
  currentSession = s;
}

/** Define (ou limpa) a sessão, persiste e notifica os ouvintes. */
export async function applySession(s: Session | null): Promise<void> {
  currentSession = s;
  if (s) await storage.saveSession(s);
  else await storage.clearSession();
  sessionListeners.forEach((l) => l(s));
}

export function subscribeSession(listener: (s: Session | null) => void): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

/** O AppContext registra aqui o que fazer quando o refresh falha de vez. */
export function onSessionExpired(handler: (() => void) | null): void {
  sessionExpiredHandler = handler;
}

// ---- Estado online/offline (resultado da última chamada) ----

let online = true;
const onlineListeners = new Set<(online: boolean) => void>();

export function isOnline(): boolean {
  return online;
}

export function subscribeOnline(listener: (online: boolean) => void): () => void {
  onlineListeners.add(listener);
  return () => onlineListeners.delete(listener);
}

function setOnline(next: boolean) {
  if (online === next) return;
  online = next;
  onlineListeners.forEach((l) => l(next));
}

// ---- Requisição base ----

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: Method;
  body?: unknown;
  /** Envia o Bearer da sessão (padrão true). */
  auth?: boolean;
  /** Interno: evita repetir o refresh mais de uma vez. */
  _retry?: boolean;
};

async function rawFetch(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${API_URL}${path}`, { ...init, signal: controller.signal });
  } catch (e) {
    setOnline(false);
    throw new NetworkError(
      (e as Error)?.name === "AbortError" ? "O servidor demorou para responder" : undefined
    );
  } finally {
    clearTimeout(timer);
  }
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function toApiError(res: Response, data: unknown): ApiError {
  const err = (data as { error?: { code?: string; message?: string; details?: unknown } } | null)
    ?.error;
  return new ApiError(
    res.status,
    err?.code ?? (res.status >= 500 ? "INTERNAL_ERROR" : "VALIDATION_ERROR"),
    err?.message ?? `Erro ${res.status}`,
    err?.details
  );
}

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && currentSession) headers.Authorization = `Bearer ${currentSession.accessToken}`;

  const res = await rawFetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  setOnline(true);

  if (res.status === 401 && auth && currentSession && !opts._retry) {
    const renewed = await refreshSession();
    if (renewed) return apiFetch<T>(path, { ...opts, _retry: true });
    throw new ApiError(401, "UNAUTHORIZED", "Sessão expirada");
  }

  if (res.status === 204) return undefined as T;
  const data = await parseBody(res);
  if (!res.ok) throw toApiError(res, data);
  return data as T;
}

// Renovação do access token — uma por vez; chamadas concorrentes esperam a mesma.
let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function doRefresh(): Promise<boolean> {
  const s = currentSession;
  if (!s?.refreshToken) return false;
  const res = await rawFetch("/auth/refresh", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: s.refreshToken }),
  });
  if (res.ok) {
    const data = (await parseBody(res)) as { accessToken: string; refreshToken: string };
    await applySession({ ...s, accessToken: data.accessToken, refreshToken: data.refreshToken });
    return true;
  }
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    // Refresh token revogado/expirado: a sessão acabou.
    await expireSession();
    return false;
  }
  throw new NetworkError("Não foi possível renovar a sessão");
}

async function expireSession(): Promise<void> {
  await applySession(null);
  sessionExpiredHandler?.();
}

// ---- Endpoints ----

export const auth = {
  checkEmail: (email: string) =>
    apiFetch<{ available: boolean }>("/auth/check-email", {
      method: "POST",
      body: { email },
      auth: false,
    }),
  register: (body: {
    name: string;
    email: string;
    password: string;
    profile: UserProfileInput;
    acceptedTerms: true;
  }) => apiFetch<AuthResponse>("/auth/register", { method: "POST", body, auth: false }),
  login: (email: string, password: string) =>
    apiFetch<AuthResponse>("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  refresh: (refreshToken: string) =>
    apiFetch<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      auth: false,
    }),
  logout: (refreshToken: string) =>
    apiFetch<void>("/auth/logout", { method: "POST", body: { refreshToken }, auth: false }),
  forgotPassword: (email: string) =>
    apiFetch<unknown>("/auth/forgot-password", { method: "POST", body: { email }, auth: false }),
  resetPassword: (email: string, code: string, newPassword: string) =>
    apiFetch<void>("/auth/reset-password", {
      method: "POST",
      body: { email, code, newPassword },
      auth: false,
    }),
};

export const me = {
  get: () => apiFetch<Snapshot>("/me"),
  putProfile: (profile: UserProfileInput) =>
    apiFetch<UserProfile>("/me/profile", { method: "PUT", body: profile }),
  patchProfile: (patch: ProfilePatch) =>
    apiFetch<UserProfile>("/me/profile", { method: "PATCH", body: patch }),
  delete: () => apiFetch<void>("/me", { method: "DELETE" }),
};

export const journey = {
  putCheckIn: (day: string, checkIn: CheckIn) =>
    apiFetch<CheckIn>(`/me/checkins/${day}`, { method: "PUT", body: checkIn }),
  relapse: () =>
    apiFetch<{ profile: UserProfile; cycles: Cycle[] }>("/me/relapse", { method: "POST", body: {} }),
  putFagerstrom: (result: FagerstromResult) =>
    apiFetch<FagerstromResult>("/me/fagerstrom", { method: "PUT", body: result }),
  putTreatment: (treatment: Treatment) =>
    apiFetch<Treatment>("/me/treatment", { method: "PUT", body: treatment }),
  postTrigger: (entry: TriggerEntry) =>
    apiFetch<TriggerEntry>("/me/triggers", { method: "POST", body: entry }),
};

export const chat = {
  get: () => apiFetch<{ conversationId: string; messages: ChatMessage[] }>("/me/chat"),
  send: (text: string) => apiFetch<ChatReply>("/me/chat/messages", { method: "POST", body: { text } }),
  clear: () => apiFetch<void>("/me/chat", { method: "DELETE" }),
};

export const healthUnits = {
  list: (params: { q?: string; kind?: "UBS" | "CAPS" } = {}) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.kind) qs.set("kind", params.kind);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<HealthUnit[]>(`/health-units${suffix}`, { auth: false });
  },
};
