# 🌐 Arquitetura do Front-End (RHSystem.UI)

> **Navegação Rápida:**
> 🗄️ [Banco de Dados](database.md) | ⚙️ [Serviços](services.md) | 🧩 [Models](models.md) | 🛠️ [Helpers](helpers.md) | 🔄 [AutoSync](autosync.md) | ☁️ [Google Drive](googledrive.md)

---

## 📌 Visão Geral
O front-end do **RHEficiente** é a interface de interação direta com o usuário, focado na gestão administrativa e na operação imutável dos quiosques de ponto. Desenvolvido para ser leve, rápido e rodar isolado do back-end.

## 📐 Padrão de Interface (UI/UX)
- **Resolução Base:** Toda a interface foi desenhada nativamente para a resolução **1920x1080 (Full HD)**.
- **Responsividade:** O escalonamento para telas menores deve ocorrer, mas o target principal (especialmente para os terminais de quiosque) é sempre 1080p.

## 🛠️ Tecnologias Principais
- **Core:** React + Vite
- **Tipagem/Script:** TypeScript / JavaScript
- **Estilização:** CSS / Tailwind (ou framework de preferência)
- **Comunicação API:** Axios

---

## 🗺️ Diagrama de Arquitetura e Fluxo de Dados

O fluxograma abaixo ilustra como as pastas e responsabilidades se comunicam dentro do front-end, desde a tela até o disparo da requisição para a API externa.

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
        Kiosk["Tela de Quiosque (Ponto)"]:::page
        Dash["Dashboard Administrativo"]:::page
    end

    subgraph Componentes ["/src/components (Reutilizáveis)"]
        direction LR
        Camera["Componente de Câmera"]:::component
        Teclado["Teclado Numérico"]:::component
        Alertas["Modais e Alertas"]:::component
    end

    subgraph Servicos ["/src/services (Comunicação HTTP)"]
        direction LR
        PontoAPI["PontoService.ts"]:::service
        AuthAPI["AuthService.ts"]:::service
    end

    Backend["API Back-End (C#)"]:::external

    %% ==========================================
    %% CONEXÕES DE FLUXO
    %% ==========================================
    Kiosk --> Camera
    Kiosk --> Teclado
    Dash --> Alertas

    Kiosk --> PontoAPI
    Dash --> AuthAPI

    PontoAPI --> Backend
    AuthAPI --> Backend

    %% ==========================================
    %% HIPERLINKS CLICÁVEIS (Navegação GitHub Corrigida)
    %% ==========================================
    click Kiosk "../RHSystem.UI/src/pages" "Ir para a pasta de Páginas"
    click Dash "../RHSystem.UI/src/pages" "Ir para a pasta de Páginas"
    click Camera "../RHSystem.UI/src/components" "Ir para a pasta de Componentes"
    click Teclado "../RHSystem.UI/src/components" "Ir para a pasta de Componentes"
    click Alertas "../RHSystem.UI/src/components" "Ir para a pasta de Componentes"
    click PontoAPI "../RHSystem.UI/src/services" "Ir para a pasta de Serviços"
    click AuthAPI "../RHSystem.UI/src/services" "Ir para a pasta de Serviços"
    click Backend "../RHSystem" "Ir para o código do Back-End"

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
