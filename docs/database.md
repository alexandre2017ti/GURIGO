# 🗄️ Arquitetura do Banco de Dados

> **Navegação Rápida:**
> 🌐 [Front-End](frontend.md) | ⚙️ [Serviços](services.md) | 🧩 [Models](models.md) | 🛠️ [Helpers](helpers.md) | 🔄 [AutoSync](autosync.md) | ☁️ [Google Drive](googledrive.md)

---

## 📌 Visão Geral
O banco de dados do **RHSystem** é projetado sob os rigores da **Portaria 671 (MTP)** para o formato REP-P (Registrador Eletrônico de Ponto via Programa). A premissa máxima é a **imutabilidade**: um registro de ponto gravado nunca sofre alteração ou exclusão direta.

## 🛠️ Tecnologias Principais
- **SGBD:** SQL Server (ou PostgreSQL, dependendo do ambiente).
- **ORM:** Entity Framework Core (Abordagem Code-First).
- **Segurança:** Hashes criptográficos (SHA-256) para validação de integridade dos registros.

---

## 🗺️ Diagrama de Relacionamento (Tabelas Core)

O diagrama abaixo ilustra como as entidades principais se relacionam. A tabela de `RegistrosPonto` atua como um *Ledger* (livro-razão) de gravação única.

```mermaid
graph TD
    %% ==========================================
    %% CLASSES DE ESTILO PARA CORES (LEGENDA)
    %% ==========================================
    classDef master fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff,rx:5,ry:5;
    classDef immutable fill:#059669,stroke:#047857,stroke-width:2px,color:#fff,rx:5,ry:5;
    classDef support fill:#d97706,stroke:#b45309,stroke-width:2px,color:#fff,rx:5,ry:5;
    classDef legenda fill:#ffffff,stroke:#9ca3af,stroke-width:1px,color:#000;

    %% ==========================================
    %% TABELAS / ENTIDADES
    %% ==========================================
    Empresa["🏢 Empresas (Empregador)"]:::master
    Funcionario["👤 Funcionarios (Colaborador)"]:::master
    Registro["⏱️ RegistrosPonto (Imutável)"]:::immutable
    Justificativa["📝 Justificativas (Ajustes)"]:::support
    AFD["📄 ExportacoesAFD (Logs)"]:::support

    %% ==========================================
    %% RELACIONAMENTOS (1:N)
    %% ==========================================
    Empresa -- "1:N (Possui)" --> Funcionario
    Funcionario -- "1:N (Registra)" --> Registro
    Registro -- "1:N (Pode ter)" --> Justificativa
    Empresa -- "1:N (Gera)" --> AFD

    %% ==========================================
    %% HIPERLINKS CLICÁVEIS (Direto para as classes no C#)
    %% ==========================================
    click Empresa href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Models](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Models)" "Ir para a pasta Models" _blank
    click Funcionario href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Models](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Models)" "Ir para a pasta Models" _blank
    click Registro href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Models](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Models)" "Ir para a pasta Models" _blank
    click Justificativa href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Models](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Models)" "Ir para a pasta Models" _blank
    click AFD href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Models](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Models)" "Ir para a pasta Models" _blank

    %% ==========================================
    %% LEGENDA INFERIOR
    %% ==========================================
    subgraph Legenda ["Legenda de Entidades"]
        direction LR
        L1["Cadastros Master"]:::master
        L2["Tabelas Imutáveis (Append-Only)"]:::immutable
        L3["Tabelas de Apoio/Log"]:::support
    end
