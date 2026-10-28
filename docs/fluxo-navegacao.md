# LiberAr — Fluxo de Navegação

Como as telas se relacionam: o que abre o quê, e para onde cada tela volta.

```mermaid
flowchart TB
    subgraph ONB["🚪 Onboarding (só na 1ª vez ou após sair da conta)"]
        direction LR
        W["Boas-vindas"] -->|Começar| ID["Identificação<br/>(nome, e-mail e senha —<br/>e-mail conferido na API)"]
        ID -->|Continuar| HAB["Hábitos<br/>(cigarros/dia, preço do maço)"]
        HAB -->|Continuar| DIAD["Dia D<br/>(quando parou)"]
        ID -.->|Voltar| W
        HAB -.->|Voltar| ID
        DIAD -.->|Voltar| HAB
    end

    subgraph AUTH["🔑 Acesso de retorno"]
        direction LR
        LOGIN["Login<br/>(e-mail + senha)"]
        FORGOT["Recuperar senha<br/>1) e-mail → 2) código de 6 dígitos + nova senha"]
        LOGIN -->|Esqueci minha senha| FORGOT
        FORGOT -.->|Voltar ao login| LOGIN
    end

    W -->|"Já tem conta? Entrar"| LOGIN
    LOGIN -.->|Criar conta| W
    LOGIN ==>|"Entrar<br/>(sessão + snapshot da API)"| HOME
    DIAD ==>|"Começar jornada<br/>(conta criada na API; perfil salvo no dispositivo)"| HOME

    subgraph TABS["📱 Navegação Principal — Bottom Nav (alterna livremente entre as 4 abas)"]
        direction LR
        HOME["🏠 Home<br/>Dashboard de Progresso"]
        CHAT["💬 Chat<br/>Assistente LiberAr"]
        EXP["📖 Explorar<br/>Informação e Saúde"]
        PERF["👤 Perfil<br/>e Configurações"]
        HOME <--> CHAT <--> EXP <--> PERF
    end

    subgraph OVER["📄 Telas sobrepostas (cobrem as abas; seta ← volta para quem abriu)"]
        CHECK["✅ Check-in Diário"]
        CONQ["🏅 Conquistas de Saúde"]
        EVO["📊 Minha Evolução"]
        UBS["📍 Localizador UBS/CAPS"]
        TERMOS["🛡️ Termos de Uso e LGPD"]
    end

    HOME -->|"banner Check-in"| CHECK
    CHECK -->|"Salvar / Voltar"| HOME
    HOME -->|"Ver todas / próxima conquista"| CONQ
    CONQ -.->|Voltar| HOME
    HOME -->|"toque no cronômetro"| EVO
    EXP -->|"Localizar UBS"| UBS
    UBS -.->|Voltar| EXP
    PERF -->|"Minha Evolução"| EVO
    EVO -.->|Voltar| HOME
    PERF -->|"Termos de Uso e LGPD"| TERMOS
    TERMOS -.->|Voltar| PERF

    subgraph MOD["⚡ Modais (aparecem por cima, sem trocar de tela)"]
        PANIC["🚨 Modal de Pânico<br/>Respiração guiada • CVV 188"]
        META["🎯 Editar Meta Diária"]
    end

    TABS ==>|"FAB laranja<br/>(visível em todas as abas)"| PANIC
    PANIC -.->|"Estou mais calmo"| TABS
    PERF -->|"Editar Meta Diária"| META
    META -.->|"Salvar / Cancelar"| PERF

    PERF ==>|"Sair da Conta<br/>(revoga a sessão e apaga dados locais)"| W
    PERF ==>|"Excluir minha conta e dados<br/>(confirmação em 2 etapas; apaga no servidor — LGPD)"| W

    style ONB fill:#F0FDFA,stroke:#14B8A6
    style TABS fill:#EFF6FF,stroke:#3B82F6
    style OVER fill:#F8FAFC,stroke:#94A3B8
    style MOD fill:#FFF7ED,stroke:#F97316
    style AUTH fill:#FDF4FF,stroke:#A855F7
```

## Regras de navegação

| Situação | Comportamento |
|---|---|
| Primeira abertura (sem perfil salvo) | O app entra direto no **Onboarding**; as abas só aparecem depois do "Começar jornada" (que cria a conta na API). Quem já tem conta usa "Entrar". |
| Aberturas seguintes | O perfil vem do cache local e o app abre direto na **Home**; com sessão válida, o outbox é reenviado e o snapshot do servidor é puxado em seguida (o servidor vence). |
| Sem conexão | O app continua funcionando com o cache local; as alterações ficam no outbox e o Perfil mostra "Sincronização pendente". Chat e Localizador usam os dados locais e sinalizam o modo offline. |
| Sessão expirada | Se o refresh token for recusado pela API, os dados locais são limpos e o app volta ao início (Onboarding/Login). |
| Recuperar senha | Etapa 1 pede o e-mail (a API responde 202 sempre, sem revelar se existe); etapa 2 pede o código de 6 dígitos recebido por e-mail e a nova senha. |
| Login social | Os botões Google/Apple só ficam ativos com `EXPO_PUBLIC_GOOGLE_CLIENT_ID` / `EXPO_PUBLIC_APPLE_CLIENT_ID`; sem eles, informam que o provedor não está configurado. |
| Abas (Home, Chat, Explorar, Perfil) | Alternam livremente pela bottom nav; nenhuma "volta" — são pares. |
| Telas sobrepostas | Abertas por botões dentro das abas; a seta **←** retorna sempre à tela que as abriu. A bottom nav fica oculta enquanto elas estão abertas. |
| Botão de Emergência (FAB) | Disponível em **qualquer aba**; abre o modal de pânico por cima de tudo, sem perder onde o usuário estava. |
| Sair da Conta | Revoga o refresh token na API, apaga os dados locais e devolve ao início do Onboarding. |
| Excluir minha conta e dados | Confirmação em duas etapas na própria tela; chama `DELETE /me` (direito ao esquecimento — LGPD), apaga os dados locais e volta ao início. |

## Origem de cada tela

| Tela | Origem |
|---|---|
| Home, Chat, Check-in, Explorar, Perfil, Modal de Pânico | **Protótipo do Figma** (mantidas fielmente, apenas conectadas aos dados reais) |
| Onboarding (4 etapas), Conquistas, Evolução, Localizador UBS/CAPS, Termos/LGPD, modal Meta Diária | **Adicionadas** a partir do diagrama de arquitetura (fluxos 1, 4 e 5) |
| Login, Recuperar senha (código), Excluir conta | **Integração com a API** (ver `docs/backend-architecture.md`) |
