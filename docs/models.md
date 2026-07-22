# 🧩 Modelos de Domínio (Models)

> **Navegação Rápida:**
> 🌐 [Front-End](frontend.md) | 🗄️ [Banco de Dados](database.md) | ⚙️ [Serviços](services.md) | 🛠️ [Helpers](helpers.md) | 🔄 [AutoSync](autosync.md) | ☁️ [Google Drive](googledrive.md)

---

## 📌 Visão Geral
A pasta `Models/` no back-end (C#) define as estruturas de dados do sistema. O projeto adota a separação rigorosa entre os objetos que mapeiam o banco de dados e os objetos que trafegam na rede (API).

## 📐 Padrões Adotados
- **Entities (Entidades):** Representam as tabelas do Entity Framework. Possuem anotações de validação (`[Required]`, `[MaxLength]`) e navegações virtuais para relacionamentos.
- **DTOs (Data Transfer Objects):** Classes "burras" usadas exclusivamente para transportar dados entre o React (Front-End) e a API (Back-End). Nunca expomos uma Entidade direta no retorno da API.
- **Enums:** Tipos enumerados fortemente tipados para padronizar status e categorias no banco, evitando strings soltas.

---

## 🗺️ Diagrama de Separação de Responsabilidades

O diagrama ilustra a barreira de segurança criada pelos DTOs para proteger as Entidades do banco de dados.

```mermaid
graph TD
    %% ==========================================
    %% CLASSES DE ESTILO PARA CORES (LEGENDA)
    %% ==========================================
    classDef entity fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff,rx:5,ry:5;
    classDef dto fill:#059669,stroke:#047857,stroke-width:2px,color:#fff,rx:5,ry:5;
    classDef enumDef fill:#d97706,stroke:#b45309,stroke-width:2px,color:#fff,rx:5,ry:5;
    classDef external fill:#4b5563,stroke:#1f2937,stroke-width:2px,color:#fff,stroke-dasharray: 5 5;

    %% ==========================================
    %% ESTRUTURA DE OBJETOS
    %% ==========================================
    FrontEnd["Front-End (React)"]:::external

    subgraph Transferência ["/Models/DTOs (Camada Externa)"]
        direction LR
        ReqDTO["BaterPontoRequestDTO"]:::dto
        ResDTO["FuncionarioResponseDTO"]:::dto
    end

    subgraph Domínio ["/Models/Entities (Camada Interna)"]
        direction LR
        EntFunc["Funcionario"]:::entity
        EntReg["RegistroPonto"]:::entity
    end

    subgraph Enumeradores ["/Models/Enums"]
        direction LR
        EnumTipo["TipoBatida"]:::enumDef
    end

    %% ==========================================
    %% FLUXO (Mapeamento)
    %% ==========================================
    FrontEnd -- "POST (JSON)" --> ReqDTO
    ReqDTO -- "Valida e Converte" --> EntReg
    
    EntFunc -- "Filtra Campos Sensíveis" --> ResDTO
    ResDTO -- "GET (JSON)" --> FrontEnd

    EntReg -. "Propriedade Tipada" .-> EnumTipo

    %% ==========================================
    %% HIPERLINKS CLICÁVEIS (Forçando saída do Iframe do GitHub)
    %% ==========================================
    click ReqDTO href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Models/DTOs](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Models/DTOs)" "Ir para DTOs" _blank
    click ResDTO href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Models/DTOs](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Models/DTOs)" "Ir para DTOs" _blank
    click EntFunc href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Models/Entities](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Models/Entities)" "Ir para Entidades" _blank
    click EntReg href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Models/Entities](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Models/Entities)" "Ir para Entidades" _blank
    click EnumTipo href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Models/Enums](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Models/Enums)" "Ir para Enums" _blank

    %% ==========================================
    %% LEGENDA INFERIOR
    %% ==========================================
    subgraph Legenda ["Legenda de Classes"]
        direction LR
        L1["Entidades (EF Core)"]:::entity
        L2["DTOs (JSON API)"]:::dto
        L3["Enums (Tipagem)"]:::enumDef
    end
