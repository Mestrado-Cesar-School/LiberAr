# LiberAr — Backend: arquitetura e contrato da API

Este documento é a fonte única de verdade do backend do LiberAr. Ele descreve a
arquitetura, o modelo de dados, o contrato REST consumido pelo app (React
Native + Expo) e a estratégia de sincronização offline-first do cliente.

## 1. Visão geral

```
┌──────────────────────────┐      HTTPS/JSON      ┌───────────────────────────┐
│  App LiberAr (Expo)      │ ───────────────────▶ │  API LiberAr (Fastify)    │
│  src/data/api.ts         │ ◀─────────────────── │  server/src               │
│  src/data/storage.ts     │   Bearer access JWT  │   ├─ modules/auth         │
│  (cache local + outbox)  │                      │   ├─ modules/me           │
└──────────────────────────┘                      │   ├─ modules/journey      │
                                                  │   ├─ modules/chat ──────┐ │
                                                  │   └─ modules/healthUnits│ │
                                                  └──────────┬────────────┬─┘
                                                             │ Prisma     │ Claude API
                                                  ┌──────────▼───┐   ┌────▼──────────┐
                                                  │ PostgreSQL 16│   │ claude-opus-5-5│
                                                  └──────────────┘   └───────────────┘
```

| Camada | Tecnologia | Motivo |
|---|---|---|
| Runtime | Node.js 24 + TypeScript 6 (CommonJS via `module: nodenext`) | mesma linguagem do app; tipos do domínio compartilhados por cópia |
| HTTP | Fastify 5 + `fastify-type-provider-zod` + `@fastify/swagger` (+ UI em `/docs`) | validação com Zod, OpenAPI gerado automaticamente |
| Banco | PostgreSQL 16 (Docker) + Prisma 6 (migrations + seed) | relacional, migrações versionadas |
| Auth | `@fastify/jwt` (access 15 min, HS256) + refresh token opaco rotativo (30 dias, hash SHA-256 no banco) + `bcryptjs` | padrão mobile, revogação server-side |
| E-mail | `nodemailer` (SMTP via `SMTP_URL`; sem SMTP, o código é logado no console) | recuperação de senha por código de 6 dígitos |
| LLM | `@anthropic-ai/sdk` — modelo `claude-opus-5-5`, `output_config.effort: "low"`, `fallbacks: "default"` | assistente empático com guardrails; sem chave → motor de regras local |
| Testes | Vitest + `app.inject()` contra banco Postgres de teste (`liberar_test`) | integração real, sem mocks de banco |

Diretórios:

```
server/
  prisma/schema.prisma      # modelo de dados (CONGELADO durante a implementação paralela)
  prisma/migrations/        # migrações geradas
  prisma/seed.ts            # unidades de saúde (UBS/CAPS) + usuário demo
  src/index.ts              # bootstrap (listen)
  src/app.ts                # buildApp(): plugins, módulos, error handler
  src/config.ts             # env validado com zod
  src/lib/prisma.ts         # PrismaClient singleton
  src/lib/errors.ts         # AppError + códigos
  src/lib/serialize.ts      # linhas do banco → tipos do app (wire)
  src/lib/snapshot.ts       # buildSnapshot(userId)
  src/domain/types.ts       # tipos do app (cópia de src/core/types.ts) + tipos da API
  src/domain/schemas.ts     # zod schemas dos payloads
  src/domain/progress.ts    # Motor de Progresso + conquistas (cópia de src/core)
  src/plugins/auth.ts       # JWT + preHandler `app.authenticate`
  src/modules/auth/         # registro, login, refresh, logout, senha, OAuth
  src/modules/me/           # GET /me, perfil, export LGPD, DELETE /me
  src/modules/journey/      # check-ins, recaída/ciclos, Fagerström, tratamento, gatilhos, progresso
  src/modules/chat/         # assistente (Claude + guardrails + fallback por regras)
  src/modules/healthUnits/  # localizador UBS/CAPS
  test/                     # setup, helpers e testes de integração
```

## 2. Modelo de dados (Prisma)

Ver `server/prisma/schema.prisma`. Resumo:

- **User** — conta: `email` (único), `name`, `passwordHash?`, `authMethod` (`email|google|apple`), `providerSubject?`, `avatar?`, `termsAcceptedAt?`.
- **Profile** (1:1) — jornada: `quitDate`, `cigsPerDay`, `packPrice`, `cigsPerPack`, `usageType`, `vape` (JSON), `stopMethod`, `smokeDuration`, `stopReason(+Text)`, `mainFear(+Text)`, `lastLapseDate?`, `reminder*`, `tourDone`.
- **CheckIn** — um por dia (`@@unique([userId, day])`, `day` = `AAAA-MM-DD` no fuso do aparelho).
- **Cycle** — sequência encerrada ao "Reiniciar minha contagem".
- **FagerstromResult** — histórico; a API devolve o mais recente.
- **Treatment** (1:1), **TriggerEntry**, **Conversation** + **ChatMessage**, **HealthUnit** (seed), **RefreshToken**, **PasswordReset**.

Enums pequenos (`usageType`, `mood`, etc.) são `String` no banco e validados por Zod na borda da API — evita mapeamento entre nomes de enum do Prisma e os valores do app (`"1-5"`, `"lt1"`…).

## 3. Formato de erro

Toda resposta de erro tem o formato:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": { } } }
```

| HTTP | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | payload inválido (Zod) — `details.issues` |
| 401 | `UNAUTHORIZED` | token ausente/expirado/inválido |
| 401 | `INVALID_CREDENTIALS` | login com e-mail/senha incorretos |
| 400 | `INVALID_CODE` | código de recuperação inválido/expirado/excedido |
| 409 | `EMAIL_TAKEN` | e-mail já cadastrado |
| 404 | `NOT_FOUND` | recurso inexistente |
| 429 | `RATE_LIMITED` | limite de requisições |
| 503 | `LLM_UNAVAILABLE` | (uso interno; o chat sempre responde com fallback) |
| 500 | `INTERNAL_ERROR` | erro não tratado |

## 4. Autenticação

- Access token: JWT HS256, `sub` = `User.id`, validade `JWT_ACCESS_TTL` (padrão 15 min). Header `Authorization: Bearer <token>`.
- Refresh token: string aleatória (48 bytes base64url); guardado como SHA-256 em `RefreshToken`; rotacionado a cada `/auth/refresh` (o antigo é revogado); validade 30 dias; revogado em logout, troca de senha e exclusão da conta.
- Rotas de auth têm rate-limit mais restrito (10/min por IP).

### Tipos de resposta

```ts
type ApiUser = { id: string; email: string; name: string; avatar?: number; authMethod: "email"|"google"|"apple"; createdAt: string };

type Snapshot = {
  user: ApiUser;
  profile: UserProfile | null;      // mesmo tipo de src/core/types.ts (name/email/avatar/authMethod já mesclados)
  checkIns: CheckIn[];              // ordenados por date asc
  cycles: Cycle[];                  // ordenados por endedAt asc
  fagerstrom: FagerstromResult | null;
  treatment: Treatment;             // EMPTY_TREATMENT quando não há registro
  triggers: TriggerEntry[];         // mais recente primeiro (com `id`)
  progress: Progress | null;        // calculado no servidor (null sem profile)
};

type AuthResponse = { accessToken: string; refreshToken: string; snapshot: Snapshot };
```

`UserProfileInput` = `UserProfile` **sem** `name`, `email`, `authMethod` (identidade vive em `User`), com `avatar?` opcional.

## 5. Endpoints

Prefixo base: `/` (sem versionamento). Todas as rotas `/me/**` exigem Bearer.

### Sistema
| Método | Rota | Resposta |
|---|---|---|
| GET | `/health` | `{ status: "ok", db: "ok"|"error", llm: "claude"|"rules" }` |
| GET | `/docs` | Swagger UI (OpenAPI em `/docs/json`) |

### Auth (`/auth`)
| Método | Rota | Body | Resposta |
|---|---|---|---|
| POST | `/auth/check-email` | `{ email }` | `200 { available: boolean }` |
| POST | `/auth/register` | `{ name, email, password, profile: UserProfileInput, acceptedTerms: true }` | `201 AuthResponse` · `409 EMAIL_TAKEN` |
| POST | `/auth/login` | `{ email, password }` | `200 AuthResponse` · `401 INVALID_CREDENTIALS` |
| POST | `/auth/refresh` | `{ refreshToken }` | `200 { accessToken, refreshToken }` · `401 UNAUTHORIZED` |
| POST | `/auth/logout` | `{ refreshToken }` | `204` (idempotente) |
| POST | `/auth/forgot-password` | `{ email }` | `202 {}` sempre (sem enumeração). Gera código de 6 dígitos, validade 15 min, máx. 5 tentativas; envia por e-mail (ou loga no console sem SMTP) |
| POST | `/auth/reset-password` | `{ email, code, newPassword }` | `204` · `400 INVALID_CODE`. Revoga todos os refresh tokens |
| POST | `/auth/oauth/google` | `{ idToken, profile?: UserProfileInput }` | `200 AuthResponse` (cria conta se não existir; `snapshot.profile` pode ser `null`) |
| POST | `/auth/oauth/apple` | `{ identityToken, fullName?, profile?: UserProfileInput }` | idem |

Senha: mínimo 8 caracteres, pelo menos 1 letra e 1 número (mesma regra do onboarding).

### Conta (`/me`)
| Método | Rota | Body | Resposta |
|---|---|---|---|
| GET | `/me` | — | `200 Snapshot` |
| PUT | `/me/profile` | `UserProfileInput` | `200 UserProfile` (cria ou substitui a jornada) |
| PATCH | `/me/profile` | `Partial<UserProfileInput> & { name?, avatar? }` | `200 UserProfile` |
| GET | `/me/export` | — | `200` JSON completo dos dados do usuário (portabilidade LGPD) |
| DELETE | `/me` | — | `204` apaga conta e todos os dados (direito ao esquecimento) |
| GET | `/me/progress` | — | `200 { progress: Progress, achievements: Achievement[] }` |

### Jornada
| Método | Rota | Body | Resposta |
|---|---|---|---|
| GET | `/me/checkins` | — | `200 CheckIn[]` |
| PUT | `/me/checkins/:day` | `CheckIn` (`day` = `AAAA-MM-DD`) | `200 CheckIn` (upsert — um por dia) |
| DELETE | `/me/checkins/:day` | — | `204` |
| GET | `/me/cycles` | — | `200 Cycle[]` |
| POST | `/me/relapse` | `{}` | `200 { profile: UserProfile, cycles: Cycle[] }` — encerra a sequência atual como `Ciclo N` (dias calculados no servidor) e define `lastLapseDate = agora` |
| GET | `/me/fagerstrom` | — | `200 FagerstromResult \| null` |
| PUT | `/me/fagerstrom` | `FagerstromResult` | `200 FagerstromResult` (adiciona ao histórico) |
| GET | `/me/treatment` | — | `200 Treatment` |
| PUT | `/me/treatment` | `Treatment` | `200 Treatment` |
| GET | `/me/triggers` | — | `200 TriggerEntry[]` |
| POST | `/me/triggers` | `TriggerEntry` | `201 TriggerEntry` |

### Assistente (chat)
| Método | Rota | Body | Resposta |
|---|---|---|---|
| GET | `/me/chat` | — | `200 { conversationId, messages: ChatMessage[] }` (cria conversa vazia se não houver) |
| POST | `/me/chat/messages` | `{ text }` (1–2000 chars) | `200 { userMessage: ChatMessage, assistantMessage: ChatMessage, source: "claude"\|"rules"\|"guardrail", crisis: boolean }` |
| DELETE | `/me/chat` | — | `204` apaga o histórico |

`ChatMessage = { id, role: "user"|"assistant", text, createdAt }`.

Pipeline do `POST /me/chat/messages`:
1. **Guardrail de crise** (pré-LLM): ideação suicida/autoagressão → resposta acolhedora fixa com CVV 188 + orientação de emergência (192/SAMU); `source: "guardrail"`, `crisis: true`. Nunca passa pelo LLM.
2. **Contexto**: `profile` + `progress` (servidor) + últimas 20 mensagens.
3. **Claude** (`claude-opus-5-5`, `max_tokens: 1024`, `output_config.effort: "low"`, system prompt em PT-BR com TCC/PNCT e limites: não prescrever medicamento nem dosagem, encaminhar à UBS, não diagnosticar, respostas curtas e empáticas, sugerir o botão de respiração). Com `fallbacks: "default"` + beta `server-side-fallback-2026-07-01`. Guardar `usage` em log.
4. **Pós-filtro**: se a resposta mencionar medicamentos/dosagem, anexa lembrete de que ajustes são com o profissional da UBS.
5. **Fallback**: sem `ANTHROPIC_API_KEY`, erro de API ou `stop_reason: "refusal"` → motor de regras (`generateReply` portado de `src/core/assistant.ts`), `source: "rules"`.

### Unidades de saúde (público)
| Método | Rota | Query | Resposta |
|---|---|---|---|
| GET | `/health-units` | `q?`, `kind?=UBS\|CAPS`, `lat?`, `lng?` | `200 HealthUnit[]` ordenado por distância (Haversine quando há lat/lng e a unidade tem coordenadas; senão `distanceKm` do seed) |
| GET | `/health-units/:id` | — | `200 HealthUnit` · `404` |

## 6. Estratégia do cliente (offline-first)

- `src/data/api.ts`: cliente HTTP (`fetch`) com base `EXPO_PUBLIC_API_URL` (padrão `http://localhost:4000`; Android emulador `http://10.0.2.2:4000`), injeta Bearer, faz refresh automático em 401 (uma vez) e lança `ApiError { status, code, message }`. Erros de rede lançam `NetworkError`.
- `src/data/storage.ts`: continua sendo o cache local (AsyncStorage) e ganha `session` (`{ accessToken, refreshToken, userId }`) e `outbox` (fila de operações pendentes).
- `src/data/sync.ts`: `pullSnapshot()` (GET /me → grava o cache), `pushOp(op)` (chama a API; em `NetworkError` enfileira no outbox), `flushOutbox()` (reexecuta em ordem no boot e antes de cada novo push).
- `AppContext`: carrega o cache (UI imediata), depois `GET /me` se houver sessão (servidor vence). Expõe `login`, `register` (= `completeOnboarding` com credenciais), `requestPasswordReset`, `resetPassword`, `logout` (revoga + limpa), `deleteAccount`, além das ações já existentes, agora sincronizadas.
- Chat: histórico via `GET /me/chat`; envio via API; se offline, usa `generateReply` local e sinaliza.
- UBS: lista via `GET /health-units`; se offline, usa a base estática.
- Login social: os botões só ficam ativos quando `EXPO_PUBLIC_GOOGLE_CLIENT_ID` / Apple estão configurados; caso contrário, explicam que o provedor não está configurado neste ambiente.

## 7. Variáveis de ambiente (`server/.env.example`)

| Var | Padrão | Descrição |
|---|---|---|
| `PORT` | `4000` | porta HTTP |
| `HOST` | `0.0.0.0` | bind |
| `DATABASE_URL` | `postgresql://liberar:liberar@localhost:5434/liberar` | Postgres do docker-compose |
| `TEST_DATABASE_URL` | `postgresql://liberar:liberar@localhost:5434/liberar_test` | banco dos testes |
| `JWT_SECRET` | — (obrigatório) | segredo HS256 |
| `JWT_ACCESS_TTL` | `15m` | validade do access token |
| `REFRESH_TTL_DAYS` | `30` | validade do refresh token |
| `CORS_ORIGIN` | `*` | origens permitidas |
| `ANTHROPIC_API_KEY` | — | sem ela, o chat usa o motor de regras |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | modelo do assistente |
| `SMTP_URL` | — | ex.: `smtp://user:pass@smtp.example.com:587`; sem ela, loga o código |
| `MAIL_FROM` | `LiberAr <no-reply@liberar.app>` | remetente |
| `GOOGLE_CLIENT_ID` / `APPLE_CLIENT_ID` | — | login social |
| `LOG_LEVEL` | `info` | pino |

## 8. Comandos

```bash
docker compose up -d postgres          # sobe o banco (porta 5434) e cria liberar + liberar_test
cd server && npm install
cp .env.example .env                    # ajuste JWT_SECRET
npm run db:migrate                      # aplica migrações (dev)
npm run db:seed                         # unidades de saúde + usuário demo (demo@liberar.app / Liberar123)
npm run dev                             # http://localhost:4000 (docs em /docs)
npm test                                # testes de integração (usa liberar_test)

docker compose up --build               # banco + API em containers
```
