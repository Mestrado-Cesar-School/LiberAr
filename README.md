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

```bash
npm install
npm start          # inicia o Expo; escaneie o QR code com o app Expo Go
npm run android    # ou abra direto no emulador Android
npm run ios        # ou no simulador iOS (macOS)
npm run web        # ou no navegador
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

Em produção, `src/core/assistant.ts` é o ponto único de integração com a API de LLM (OpenAI/AWS Bedrock) e `src/data/storage.ts` ganharia a sincronização com o banco na nuvem — como previsto no diagrama.
