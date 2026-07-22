# 🌐 Arquitetura do Front-End (RHSystem.UI)

> **Navegação Rápida:**
> 🗄️ [Banco de Dados](database.md) | ⚙️ [Serviços](services.md) | 🧩 [Models](models.md) | 🛠️ [Helpers](helpers.md) | 🔄 [AutoSync](autosync.md) | ☁️ [Google Drive](googledrive.md)

---

## 📌 Visão Geral
O front-end do **RHEficiente** é a interface de interação direta com o usuário, focado na gestão administrativa e na operação imutável dos quiosques de ponto. Desenvolvido para ser leve, rápido e rodar isolado do back-end.

## 📐 Padrão de Interface (UI/UX)
- **Resolução Base:** Toda a interface foi desenhada nativamente para a resolução **1920x1080 (Full HD)**.
- **Responsividade:** O escalonamento para telas menores deve ocorrer, mas o target principal (especialmente para os terminais de quiosque) é sempre 1080p.
- **Modo Kiosk:** A tela de batida de ponto opera como um ambiente isolado (tela cheia). A ativação ocorre via Dashboard e o destravamento exige autenticação administrativa (ícone de cadeado).

## 🛠️ Tecnologias Principais
- **Core:** React + Vite
- **Tipagem/Script:** TypeScript / JavaScript
- **Estilização:** CSS / Tailwind (ou framework de preferência)
- **Comunicação API:** Axios

---

## 🗺️ Diagrama de Arquitetura e Fluxo de Dados

O fluxograma abaixo ilustra o ciclo de navegação entre o ambiente administrativo e o terminal de ponto.

```mermaid
graph TD
    %% ==========================================
    %% CLASSES DE ESTILO PARA CORES (LEGENDA)
    %% ==========================================
    classDef page fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff,rx:5,ry:5;
    classDef component fill:#059669,stroke:#047857,stroke-width:2px,color:#fff,rx:5,ry:5;
    classDef service fill:#d97706,stroke:#b45309,stroke-width:2px,color:#fff,rx:5,ry:5;
    classDef external fill:#4b5563,stroke:#1f2937,stroke-width:2px,color:#fff,stroke-dasharray: 5 5;
    classDef legenda fill:#ffffff,stroke:#9ca3af,stroke-width:1px,color:#000;

    %% ==========================================
    %% ARQUITETURA
    %% ==========================================
    subgraph UI ["/src/pages (Telas Principais)"]
        direction LR
        Dash["Dashboard (Gestão de Unidades)"]:::page
        Kiosk["Tela de Quiosque (Ponto)"]:::page
        AdminAuth["Login Admin (Cadeado)"]:::page
    end

    subgraph Componentes ["/src/components (Reutilizáveis)"]
        direction LR
        Alertas["Modais e Alertas"]:::component
        Relogio["Relógio Sincronizado"]:::component
    end

    subgraph Servicos ["/src/services (Comunicação HTTP)"]
        direction LR
        PontoAPI["PontoService.ts"]:::service
        AuthAPI["AuthService.ts"]:::service
    end

    Backend["API Back-End (C#)"]:::external

    %% ==========================================
    %% CONEXÕES DE FLUXO (O Ciclo do Kiosk)
    %% ==========================================
    Dash -- "Botão: Definir como Kiosk" --> Kiosk
    Kiosk -- "Ícone: Cadeado" --> AdminAuth
    AdminAuth -- "Senha Correta" --> Dash

    Kiosk --> Relogio
    Dash --> Alertas

    Kiosk --> PontoAPI
    Dash --> AuthAPI
    AdminAuth --> AuthAPI

    PontoAPI --> Backend
    AuthAPI --> Backend

    %% ==========================================
    %% HIPERLINKS CLICÁVEIS (Forçando saída do Iframe do GitHub)
    %% ==========================================
    click Dash href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem.UI/src/pages](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem.UI/src/pages)" "Ir para a pasta de Páginas" _blank
    click Kiosk href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem.UI/src/pages](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem.UI/src/pages)" "Ir para a pasta de Páginas" _blank
    click AdminAuth href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem.UI/src/pages](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem.UI/src/pages)" "Ir para a pasta de Páginas" _blank
    click Alertas href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem.UI/src/components](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem.UI/src/components)" "Ir para a pasta de Componentes" _blank
    click Relogio href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem.UI/src/components](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem.UI/src/components)" "Ir para a pasta de Componentes" _blank
    click PontoAPI href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem.UI/src/services](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem.UI/src/services)" "Ir para a pasta de Serviços" _blank
    click AuthAPI href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem.UI/src/services](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem.UI/src/services)" "Ir para a pasta de Serviços" _blank
    click Backend href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem)" "Ir para o código do Back-End" _blank

    %% ==========================================
    %% LEGENDA INFERIOR
    %% ==========================================
    subgraph Legenda ["Legenda de Arquitetura"]
        direction LR
        L1["Páginas / Views"]:::page
        L2["Componentes Visuais"]:::component
        L3["Serviços / Axios"]:::service
        L4["Sistema Externo"]:::external
    end
