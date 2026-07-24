# LiberAr — Fluxo de Navegação

Como as telas se relacionam: o que abre o quê, e para onde cada tela volta.

```mermaid
flowchart TB
    subgraph ONB["🚪 Onboarding (só na 1ª vez ou após sair da conta)"]
        direction LR
        W["Boas-vindas"] -->|Começar| ID["Identificação<br/>(nome/e-mail ou login social)"]
        ID -->|Continuar| HAB["Hábitos<br/>(cigarros/dia, preço do maço)"]
        HAB -->|Continuar| DIAD["Dia D<br/>(quando parou)"]
        ID -.->|Voltar| W
        HAB -.->|Voltar| ID
        DIAD -.->|Voltar| HAB
    end

    DIAD ==>|"Começar jornada<br/>(perfil salvo no dispositivo)"| HOME

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

    PERF ==>|"Sair da Conta<br/>(apaga dados locais)"| W

    style ONB fill:#F0FDFA,stroke:#14B8A6
    style TABS fill:#EFF6FF,stroke:#3B82F6
    style OVER fill:#F8FAFC,stroke:#94A3B8
    style MOD fill:#FFF7ED,stroke:#F97316
```

## Regras de navegação

| Situação | Comportamento |
|---|---|
| Primeira abertura (sem perfil salvo) | O app entra direto no **Onboarding**; as abas só aparecem depois do "Começar jornada". |
| Aberturas seguintes | O perfil vem do armazenamento local e o app abre direto na **Home**. |
| Abas (Home, Chat, Explorar, Perfil) | Alternam livremente pela bottom nav; nenhuma "volta" — são pares. |
| Telas sobrepostas | Abertas por botões dentro das abas; a seta **←** retorna sempre à tela que as abriu. A bottom nav fica oculta enquanto elas estão abertas. |
| Botão de Emergência (FAB) | Disponível em **qualquer aba**; abre o modal de pânico por cima de tudo, sem perder onde o usuário estava. |
| Sair da Conta | Apaga perfil e check-ins (LGPD — direito ao esquecimento) e devolve ao início do Onboarding. |

## Origem de cada tela

| Tela | Origem |
|---|---|
| Home, Chat, Check-in, Explorar, Perfil, Modal de Pânico | **Protótipo do Figma** (mantidas fielmente, apenas conectadas aos dados reais) |
| Onboarding (4 etapas), Conquistas, Evolução, Localizador UBS/CAPS, Termos/LGPD, modal Meta Diária | **Adicionadas** a partir do diagrama de arquitetura (fluxos 1, 4 e 5) |
