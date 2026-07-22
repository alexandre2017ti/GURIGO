# ⚙️ Camada de Serviços (Services)

> **Navegação Rápida:**
> 🌐 [Front-End](frontend.md) | 🗄️ [Banco de Dados](database.md) | 🧩 [Models](models.md) | 🛠️ [Helpers](helpers.md) | 🔄 [AutoSync](autosync.md) | ☁️ [Google Drive](googledrive.md)

---

## 📌 Visão Geral
A pasta `Services/` dentro do **RHSystem (Back-End)** concentra toda a regra de negócio complexa, integrações com APIs externas e geração de arquivos. A regra de ouro da nossa arquitetura é: **Controllers apenas recebem a requisição de ponto e repassam para os Serviços processarem.**

## 🛠️ Tecnologias e Padrões
- **Injeção de Dependência (DI):** Todos os serviços são registrados no `Program.cs` (ex: `AddScoped<IAzureFaceService, AzureFaceService>()`).
- **Assincronismo:** Uso intensivo de `async/await` para não travar a thread do servidor durante integrações (ex: chamadas ao Azure ou Google Drive).
- **Isolamento de Segredos:** Chaves de API (`AzureKey`, `GoogleCredentials`) são injetadas via `IConfiguration` lendo o `appsettings.json` ou variáveis de ambiente.

---

## 🗺️ Diagrama de Orquestração de Serviços

O diagrama abaixo mostra como os serviços se comunicam quando o funcionário tenta bater o ponto no quiosque.

```mermaid
graph TD
    %% ==========================================
    %% CLASSES DE ESTILO PARA CORES (LEGENDA)
    %% ==========================================
    classDef controller fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff,rx:5,ry:5;
    classDef service fill:#059669,stroke:#047857,stroke-width:2px,color:#fff,rx:5,ry:5;
    classDef external fill:#4b5563,stroke:#1f2937,stroke-width:2px,color:#fff,stroke-dasharray: 5 5;
    classDef db fill:#d97706,stroke:#b45309,stroke-width:2px,color:#fff,rx:5,ry:5;

    %% ==========================================
    %% ARQUITETURA DE SERVIÇOS
    %% ==========================================
    Endpoint["PontoController (Recepção)"]:::controller
    
    subgraph Camada de Serviços ["/Services (Core de Negócios)"]
        direction TB
        Facial["AzureFaceService (Validação Biométrica)"]:::service
        Registro["PontoService (Gravação Imutável)"]:::service
        NTP["TimeSyncService (Hora Legal)"]:::service
        AFD["AfdGenerationService (Gerador de Arquivo)"]:::service
    end

    Azure["API Azure Face"]:::external
    BancoDeDados["SQL Server / EF Core"]:::db
    Drive["Google Drive API"]:::external

    %% ==========================================
    %% FLUXO DE EXECUÇÃO
    %% ==========================================
    Endpoint --> Facial
    Endpoint --> NTP
    
    Facial -- "Verifica Foto" --> Azure
    Azure -- "Score > 90%" --> Registro
    NTP -- "Valida Hora" --> Registro
    
    Registro -- "Salva Hash/NSR" --> BancoDeDados
    
    BancoDeDados -. "Fechamento Mensal/Diário" .-> AFD
    AFD -- "Upload Backup" --> Drive

    %% ==========================================
    %% HIPERLINKS CLICÁVEIS (Forçando saída do Iframe do GitHub)
    %% ==========================================
    click Endpoint href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Controllers](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Controllers)" "Ir para Controllers" _blank
    click Facial href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Services](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Services)" "Ir para Serviços" _blank
    click Registro href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Services](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Services)" "Ir para Serviços" _blank
    click NTP href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Services](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Services)" "Ir para Serviços" _blank
    click AFD href "[https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Services](https://github.com/alexandre2017ti/GURIGO/tree/main/RHSystem/Services)" "Ir para Serviços" _blank
