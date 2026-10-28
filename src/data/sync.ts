// Sincronização com a API (docs/backend-architecture.md, seção 6).
//
// - pullSnapshot(): GET /me → grava o cache local (o servidor vence).
// - pushOp(op): executa a operação na API; sem rede, enfileira no outbox e o
//   app segue com o estado local (otimista).
// - flushOutbox(): reexecuta a fila em ordem — no boot e antes de cada push,
//   para uma operação nova nunca passar na frente de uma pendente.

import {
  CheckIn,
  Cycle,
  FagerstromResult,
  Treatment,
  TriggerEntry,
  UserProfile,
  UserProfileInput,
} from "../core/types";
import * as api from "./api";
import { ApiError, NetworkError, ProfilePatch, Snapshot } from "./api";
import * as storage from "./storage";

type OpPayloads = {
  "profile.put": UserProfileInput;
  "profile.patch": ProfilePatch;
  "checkin.put": { day: string; checkIn: CheckIn };
  relapse: Record<string, never>;
  "fagerstrom.put": FagerstromResult;
  "treatment.put": Treatment;
  "trigger.post": TriggerEntry;
};

type OpResults = {
  "profile.put": UserProfile;
  "profile.patch": UserProfile;
  "checkin.put": CheckIn;
  relapse: { profile: UserProfile; cycles: Cycle[] };
  "fagerstrom.put": FagerstromResult;
  "treatment.put": Treatment;
  "trigger.post": TriggerEntry;
};

export type OutboxOpKind = keyof OpPayloads;

export type OutboxOp = {
  [K in OutboxOpKind]: { id: string; kind: K; payload: OpPayloads[K]; createdAt: string };
}[OutboxOpKind];

export type OutboxOpInput = {
  [K in OutboxOpKind]: { kind: K; payload: OpPayloads[K] };
}[OutboxOpKind];

export type PushResult<K extends OutboxOpKind> =
  | { queued: true }
  | { queued: false; result: OpResults[K] };

// ---- Ouvintes do tamanho da fila (AppContext mostra "sincronização pendente") ----

const pendingListeners = new Set<(count: number) => void>();

export function subscribePending(listener: (count: number) => void): () => void {
  pendingListeners.add(listener);
  return () => pendingListeners.delete(listener);
}

async function persistOutbox(ops: OutboxOp[]): Promise<void> {
  await storage.saveOutbox(ops);
  pendingListeners.forEach((l) => l(ops.length));
}

export async function getPendingCount(): Promise<number> {
  return (await storage.loadOutbox()).length;
}

// ---- Snapshot ----

/** Grava um snapshot do servidor em todos os caches locais. */
export async function storeSnapshot(snap: Snapshot): Promise<void> {
  await Promise.all([
    snap.profile ? storage.saveProfile(snap.profile) : storage.clearProfile(),
    storage.saveCheckIns(snap.checkIns),
    storage.saveCycles(snap.cycles),
    snap.fagerstrom ? storage.saveFagerstrom(snap.fagerstrom) : storage.clearFagerstrom(),
    storage.saveTreatment(snap.treatment),
    storage.saveTriggers(snap.triggers),
  ]);
}

export async function pullSnapshot(): Promise<Snapshot> {
  const snap = await api.me.get();
  await storeSnapshot(snap);
  return snap;
}

// ---- Execução ----

function executeOp<K extends OutboxOpKind>(op: { kind: K; payload: OpPayloads[K] }): Promise<OpResults[K]> {
  const o = op as OutboxOpInput;
  switch (o.kind) {
    case "profile.put":
      return api.me.putProfile(o.payload) as Promise<OpResults[K]>;
    case "profile.patch":
      return api.me.patchProfile(o.payload) as Promise<OpResults[K]>;
    case "checkin.put":
      return api.journey.putCheckIn(o.payload.day, o.payload.checkIn) as Promise<OpResults[K]>;
    case "relapse":
      return api.journey.relapse() as Promise<OpResults[K]>;
    case "fagerstrom.put":
      return api.journey.putFagerstrom(o.payload) as Promise<OpResults[K]>;
    case "treatment.put":
      return api.journey.putTreatment(o.payload) as Promise<OpResults[K]>;
    case "trigger.post":
      return api.journey.postTrigger(o.payload) as Promise<OpResults[K]>;
  }
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Enfileira com deduplicação: patch de perfil mescla, check-in substitui o mesmo dia. */
function enqueue(queue: OutboxOp[], input: OutboxOpInput): OutboxOp[] {
  const op = { ...input, id: newId(), createdAt: new Date().toISOString() } as OutboxOp;
  const last = queue[queue.length - 1];
  if (op.kind === "profile.patch" && last?.kind === "profile.patch") {
    return [...queue.slice(0, -1), { ...last, payload: { ...last.payload, ...op.payload } }];
  }
  if (op.kind === "checkin.put") {
    return [...queue.filter((q) => !(q.kind === "checkin.put" && q.payload.day === op.payload.day)), op];
  }
  if (op.kind === "treatment.put" || op.kind === "fagerstrom.put" || op.kind === "profile.put") {
    // Só o último estado importa para operações de substituição.
    return [...queue.filter((q) => q.kind !== op.kind), op];
  }
  return [...queue, op];
}

// flushOutbox serializado: chamadas concorrentes esperam a mesma execução.
let flushing: Promise<number> | null = null;

/** Reexecuta a fila. Devolve quantas operações continuam pendentes. */
export function flushOutbox(): Promise<number> {
  if (!flushing) {
    flushing = doFlush().finally(() => {
      flushing = null;
    });
  }
  return flushing;
}

async function doFlush(): Promise<number> {
  let queue = await storage.loadOutbox();
  if (queue.length === 0) return 0;
  while (queue.length > 0) {
    const op = queue[0];
    try {
      await executeOp(op);
      queue = queue.slice(1);
      await persistOutbox(queue);
    } catch (e) {
      if (e instanceof NetworkError) break;
      if (e instanceof ApiError && e.status < 500 && e.status !== 401 && e.status !== 429) {
        // Dados inválidos/estado incompatível: descarta para não travar a fila.
        console.warn(`[sync] operação ${op.kind} descartada (${e.code}: ${e.message})`);
        queue = queue.slice(1);
        await persistOutbox(queue);
        continue;
      }
      // 401 (sessão expirada), 429 ou 5xx: tenta de novo na próxima oportunidade.
      break;
    }
  }
  return queue.length;
}

/**
 * Executa a operação na API. Sem rede (NetworkError) enfileira e devolve
 * { queued: true }; erros da API (ApiError) são relançados para a UI tratar.
 */
export async function pushOp<K extends OutboxOpKind>(
  input: { kind: K; payload: OpPayloads[K] }
): Promise<PushResult<K>> {
  if (!api.getSession()) return { queued: true };

  const pending = await flushOutbox();
  if (pending > 0) {
    // Ainda há operações presas (sem rede): preserva a ordem.
    await persistOutbox(enqueue(await storage.loadOutbox(), input as OutboxOpInput));
    return { queued: true };
  }
  try {
    const result = await executeOp(input);
    return { queued: false, result };
  } catch (e) {
    if (e instanceof NetworkError) {
      await persistOutbox(enqueue(await storage.loadOutbox(), input as OutboxOpInput));
      return { queued: true };
    }
    throw e;
  }
}
