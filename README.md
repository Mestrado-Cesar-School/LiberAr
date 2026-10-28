# LiberAr

Projeto com tema saúde, desenvolvido para o Mestrado Profissional de Engenharia de Software.

Aplicativo móvel (React Native + Expo) de apoio à cessação do tabagismo, com abordagem acolhedora baseada em psicologia cognitivo-comportamental e alinhado ao Programa Nacional de Controle do Tabagismo (PNCT).

## Fluxos (conforme diagrama de arquitetura)

1. **Onboarding — Hábitos & Dia D**: boas-vindas, identificação (com login social simulado), hábitos de consumo e escolha do Dia D.
2. **Acompanha Dias e Economia**: dashboard com cronômetro real, dinheiro economizado e cigarros evitados, calculados pelo Motor de Progresso.
3. **Conversa / Botão de Pânico**: chatbot empático com guardrails locais (TCC) e FAB de emergência com respiração guiada e CVV (188).
4. **Busca Atendimento Gratuito**: localizador de UBS/CAPS com busca, filtros e serviços (base estática de exemplo).
5. **Visualiza Evolução**: gráfico do nível de fissura, humor por dia e resumo da jornada.

Além disso: painel completo de Conquistas de Saúde (10 marcos desbloqueados por tempo real sem fumar), check-in diário persistido, edição de meta, tela de Termos de Uso/LGPD e logout com direito ao esquecimento.

### Ciclo de uso diário

- **Respiração guiada animada**: o Botão de Emergência abre um exercício de respiração 4-4-6 (inspira/segura/expira) com círculo animado, contagem de ciclos e encerramento acolhedor.
- **Regra de recaída (TCC)**: ao registrar um lapso no check-in, o cronômetro de dias recomeça no lapso mais recente, mas a economia acumulada desde o Dia D é preservada (descontados os cigarros fumados).
- **Check-in único por dia**: o registro do dia é editável em vez de duplicado; a Home indica quando o check-in de hoje já foi feito.
- **Leitura de artigos**: feed do Explorar com conteúdo completo (PNCT, respiração, ciência) e busca funcional.
- **Lembrete diário**: notificação de check-in configurável no Perfil (via `expo-notifications`), com horário persistido.

## Como rodar

### 1. Backend (API + banco)

Pré-requisitos: Node.js 22+ e Docker.

```bash
docker compose up -d postgres     # PostgreSQL 16 na porta 5434 (cria os bancos liberar e liberar_test)
cd server
npm install
cp .env.example .env              # ajuste JWT_SECRET; ANTHROPIC_API_KEY é opcional
npm run db:migrate                # aplica as migrações
npm run db:seed                   # unidades UBS/CAPS + conta demo (demo@liberar.app / Liberar123)
npm run dev                       # API em http://localhost:4000 — documentação em http://localhost:4000/docs
```

Sem `ANTHROPIC_API_KEY`, o assistente responde com o motor de regras local (TCC); com a chave, usa a API Claude (`claude-opus-5-5`) com guardrails. Sem `SMTP_URL`, o código de recuperação de senha é impresso no console da API.

Tudo em containers (banco + API): `docker compose up --build`.

### 2. App (Expo)

```bash
cp .env.example .env   # EXPO_PUBLIC_API_URL=http://localhost:4000 (Android emulador: http://10.0.2.2:4000; aparelho físico: IP da máquina)
npm install
npm start              # inicia o Expo; escaneie o QR code com o app Expo Go
npm run android        # ou abra direto no emulador Android
npm run ios            # ou no simulador iOS (macOS)
npm run web            # ou no navegador
```

O app continua funcionando offline: o cache local (AsyncStorage) abre o app na hora e as alterações feitas sem conexão ficam numa fila (outbox) sincronizada quando a API volta.

### 3. Testes e verificação

```bash
npm run typecheck                 # app
cd server && npm run typecheck    # API
cd server && npm test             # testes de integração da API (banco liberar_test)
```

## Arquitetura

A estrutura de pastas espelha o diagrama do sistema:

```
App.tsx                          # raiz: onboarding gate, abas, overlays e modal de pânico
src/theme/colors.ts              # paleta (azul, verde menta, laranja)
src/context/AppContext.tsx       # estado global (perfil, check-ins) — Autenticação & LGPD

src/core/                        # Core do Sistema — lógica e regras de negócio
  progressEngine.ts              #   Motor de Cálculo de Progresso (com regra de recaída)
  achievementRules.ts            #   Validador de Regras de Conquistas
  assistant.ts                   #   Controlador de Contexto & Guardrails (ponto de integração LLM)
  notifications.ts               #   Lembrete diário de check-in (expo-notifications)
  types.ts                       #   tipos do domínio

src/data/                        # Camada de Dados
  storage.ts                     #   Gerenciador de Sincronização Local (AsyncStorage)
  ubsUnits.ts                    #   Base Estática de Unidades UBS/CAPS
  articles.ts                    #   Conteúdo educativo do Explorar (literatura PNCT)

src/components/                  # navegação global
  BottomNav.tsx                  #   abas + FAB de emergência
  PanicModal.tsx                 #   modal de contenção
  BreathingExercise.tsx          #   exercício de respiração guiada animada

src/screens/                     # Camada de Apresentação
  OnboardingScreen.tsx           #   fluxo 1 — Hábitos & Dia D
  HomeScreen.tsx                 #   fluxo 2 — Dashboard Principal de Métricas
  ChatScreen.tsx                 #   fluxo 3 — Interface do Chatbot Empático
  UbsLocatorScreen.tsx           #   fluxo 4 — Localizador de Unidades de Saúde
  EvolutionScreen.tsx            #   fluxo 5 — Visualiza Evolução
  AchievementsScreen.tsx         #   Painel de Conquistas & Badges
  CheckInScreen.tsx              #   Check-in Diário (com registro de recaída)
  InfoScreen.tsx                 #   Explorar (feed de conteúdo)
  ArticleScreen.tsx              #   Leitura de artigo
  ProfileScreen.tsx              #   Perfil e Configurações
  TermsScreen.tsx                #   Termos de Uso e LGPD
```

src/data/api.ts                  #   cliente HTTP da API (JWT, refresh automático, erros tipados)
src/data/sync.ts                 #   pull do snapshot + outbox (fila offline)

server/                          # Backend — API REST (Fastify + Prisma + PostgreSQL + Claude)
  prisma/schema.prisma           #   modelo de dados e migrações
  prisma/seed.ts                 #   unidades de saúde + conta demo
  src/modules/auth               #   cadastro, login, refresh, recuperação de senha, OAuth
  src/modules/me                 #   conta, perfil, exportação e exclusão (LGPD)
  src/modules/journey            #   check-ins, recaídas, Fagerström, tratamento, gatilhos, progresso
  src/modules/chat               #   assistente (Claude + guardrails + fallback por regras)
  src/modules/healthUnits        #   localizador UBS/CAPS
  test/                          #   testes de integração (Vitest)
```

## Backend

A API, o modelo de dados, o contrato REST e a estratégia de sincronização offline-first estão documentados em [`docs/backend-architecture.md`](docs/backend-architecture.md). A documentação interativa (OpenAPI/Swagger) fica em `http://localhost:4000/docs` com a API rodando.

Pontos principais:

- **Autenticação**: JWT de acesso (15 min) + refresh token rotativo (30 dias) guardado como hash; recuperação de senha por código de 6 dígitos; endpoints prontos para login com Google/Apple (exigem `GOOGLE_CLIENT_ID`/`APPLE_CLIENT_ID`).
- **LGPD**: `GET /me/export` (portabilidade) e `DELETE /me` (direito ao esquecimento, apaga tudo em cascata); logout revoga o refresh token.
- **Assistente**: `src/modules/chat` é o ponto único de integração com o LLM — guardrail de crise (CVV 188) antes do modelo, prompt com contexto do usuário (dias sem fumar, economia, motivação), pós-filtro para medicamentos e fallback para o motor de regras de TCC.
- **Motor de Progresso** e **Validador de Conquistas** são calculados também no servidor (`server/src/domain/progress.ts`), espelhando o core do app.
