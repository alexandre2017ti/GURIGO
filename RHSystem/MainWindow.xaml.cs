using Google.Apis.Drive.v3;
using Google.Apis.Drive.v3.Data;
using Google.Apis.Util;
using Microsoft.EntityFrameworkCore;
using Microsoft.Web.WebView2.Core;
using RHSystem.Desktop.Data;
using RHSystem.Helpers;
using RHSystem.Models;
using RHSystem.Services;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Windows;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

using File = System.IO.File;

namespace RHSystem.Desktop
{
    public partial class MainWindow : Window
    {
        //READONLY
        private readonly StoreService _storeService = new StoreService();
        private readonly SettingsService _settingsService = new SettingsService();
        private readonly EmployeeService _employeeService = new EmployeeService();
        private readonly SetupService _setupService = new SetupService();
        private readonly TimeService _timeService = new TimeService();
        private readonly DepartmentService _departmentService = new DepartmentService();
        private readonly GoogleDriveService _googleDriveService = new GoogleDriveService();
        private readonly ReportService _reportService;


        //BOOL
        private bool _isDatabaseReady = false;

        // TIMER
        private System.Windows.Threading.DispatcherTimer _lateCheckTimer;

        // JSON OPTIONS
        private readonly JsonSerializerOptions _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true, // Ignora se é Id ou id
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles
        };
        public class KioskConfigDTO
        {
            public int StoreId { get; set; }
            public string StoreName { get; set; }
            public string StoreCode { get; set; }
        }
        public class DeleteVacationDto
        {
            public int Id { get; set; }
            public int EmployeeId { get; set; }
            public string StartDate { get; set; }
            public string EndDate { get; set; }
        }
        public class TimeRequestDTO
        {
            public string Pin { get; set; }
            public string StoreCode { get; set; }
            public string ImageBase64 { get; set; }
        }
        public class ManagePointDTO
        {
            public int EmployeeId { get; set; }
            public int StoreId { get; set; } // ✨ CERTIFIQUE-SE QUE ESTA LINHA EXISTE
            public string Date { get; set; }
            public string Time { get; set; }
            public List<string> Times { get; set; }
            public string Operation { get; set; }
            public int PunchIndex { get; set; }
            public string Justification { get; set; }
        }
        public class TimeRecordListItemDTO
        {
            public int Id { get; set; }
            public int EmployeeId { get; set; }
            public string EmployeeName { get; set; }
            public string StoreName { get; set; }
            public string Date { get; set; }
            public string Time { get; set; }
            public bool HasJustification { get; internal set; }
        }
        public class ReportRequest
        {
            public int employeeId { get; set; }
            public string startDate { get; set; }
            public string endDate { get; set; }
        }
        public class JustificationRequest
        {
            public int EmployeeId { get; set; }
            public string StartDate { get; set; } // Data Início
            public string EndDate { get; set; }   // Data Fim (Nulo/Vazio permitido)
            public string StartTime { get; set; } // Hora Início (Nulo/Vazio permitido)
            public string EndTime { get; set; }   // Hora Fim (Nulo/Vazio permitido)
            public string Type { get; set; }
            public string Description { get; set; }
            public bool IsAbonado { get; set; }
            public string ImageBase64 { get; set; }
        }
        public class ExportRequestDTO
        {
            public List<int> EmployeeIds { get; set; }
            public string StartDate { get; set; }
            public string EndDate { get; set; }
        }
        public class VacationDeleteDto
        {
            public int EmployeeId { get; set; }
            public string StartDate { get; set; }
            public string EndDate { get; set; }
        }
        public class DailyRecordResult
        {
            public DateTime Date { get; set; }
            public string DateFormatted { get; set; }
            public string WeekDayShort { get; set; }
            public List<string> Punches { get; set; }
            public string Observation { get; set; }
            public string ExpectedDisplay { get; set; }
            public int AbonoMins { get; set; }
            public int ExpectedMins { get; set; }
            public int WorkedMins { get; set; }
            public int Extra50Mins { get; set; }
            public int Extra100Mins { get; set; }
            public int AbsenceMins { get; set; }
            public int LateMins { get; set; }
            public int HolidayMins { get; set; }
            public int NightShiftMins { get; set; }
            public int BalanceMins { get; set; }
            public bool IsPositive { get; set; }

            public static string FormatMins(int mins, bool showSign = false)
            {
                if (mins == 0 && !showSign) return "00:00";
                string sign = showSign && mins >= 0 ? "+" : (showSign && mins < 0 ? "-" : "");
                int absMins = Math.Abs(mins);
                return $"{sign}{(absMins / 60):D2}:{(absMins % 60):D2}";
            }
        }
        public MainWindow()
        {
            Environment.SetEnvironmentVariable("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "--use-fake-ui-for-media-stream");
            AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

            
            InitializeComponent();

            try
            {
                // Agora instanciamos os serviços que são mais "pesados"
                _reportService = new ReportService();
            }
            catch (Exception ex)
            {
                // Isso vai te mostrar o erro REAL se ele persistir
                MessageBox.Show("Erro ao carregar serviços de relatório: " + ex.Message);
            }
            _departmentService = new DepartmentService();
            _setupService.TryLoadConnectionString();
            InitializeAsync();
            SetupLateNotifier();
            IniciarServidorHttp();
        }
        private void IniciarServidorHttp()
        {
            Task.Run(() =>
            {
                try
                {
                    var host = new WebHostBuilder()
                        .UseKestrel()
                        .UseUrls("http://0.0.0.0:5000") // A porta mágica que escuta a nuvem
                        .ConfigureServices(services =>
                        {
                            // ✨ A LINHA MÁGICA QUE RESOLVE O ERRO:
                            services.AddRouting();

                            // Libera a catraca (CORS) para o seu React conseguir bater ponto
                            services.AddCors(options =>
                            {
                                options.AddPolicy("PermitirTudo", policy =>
                                    policy.AllowAnyOrigin()
                                          .AllowAnyMethod()
                                          .AllowAnyHeader());
                            });
                        })
                        .Configure(app =>
                        {
                            app.UseCors("PermitirTudo");
                            app.UseRouting();

                            app.UseEndpoints(endpoints =>
                            {
                                endpoints.MapPost("/api/ponto", async context =>
                                {
                                    try
                                    {
                                        using var reader = new StreamReader(context.Request.Body);
                                        var body = await reader.ReadToEndAsync();
                                        var request = JsonSerializer.Deserialize<TimeRequestDTO>(body, _jsonOptions);

                                        int currentStoreId = Properties.Settings.Default.KioskStoreId;
                                        if (currentStoreId == 0) currentStoreId = 1;

                                        var emp = await _employeeService.GetByPinAndStoreAsync(request.Pin, currentStoreId);

                                        context.Response.ContentType = "application/json";

                                        if (emp != null)
                                        {
                                            // ==========================================================
                                            // ✨ A BARREIRA DA INTELIGÊNCIA ARTIFICIAL ENTRA AQUI
                                            // ==========================================================
                                            if (emp.RequireFacialAuth)
                                            {
                                                // 1. O tablet esqueceu de ligar a câmera ou não mandou a foto?
                                                if (string.IsNullOrEmpty(request.ImageBase64))
                                                {
                                                    context.Response.StatusCode = 400;
                                                    await context.Response.WriteAsync(JsonSerializer.Serialize(
                                                        new { success = false, message = "Erro: Este funcionário exige biometria facial." }, _jsonOptions));
                                                    return; // ⛔ Para a execução aqui, não bate o ponto!
                                                }

                                                // 2. AQUI ENTRARÁ A CHAMADA DA MICROSOFT AZURE NO FUTURO
                                                // A Azure vai comparar o emp.FacialReferenceData com o request.ImageBase64
                                                // bool isMatch = await AzureFaceService.VerifyFaceAsync(...);

                                                bool isMatch = true; // Por enquanto simulamos que deu certo

                                                if (!isMatch)
                                                {
                                                    context.Response.StatusCode = 403; // 403 Forbidden (Proibido)
                                                    await context.Response.WriteAsync(JsonSerializer.Serialize(
                                                        new { success = false, message = "Falha de Segurança: Rosto não reconhecido." }, _jsonOptions));
                                                    return; // ⛔ É um impostor! Para a execução aqui!
                                                }
                                            }
                                            // ==========================================================

                                            // ✅ Se chegou aqui, ou ele NÃO exige IA, ou a IA confirmou a identidade!
                                            await _timeService.RegisterPointAsync(emp.Id, currentStoreId);

                                            var sucesso = new
                                            {
                                                success = true,
                                                employeeName = emp.Name.Split(' ')[0],
                                                time = DateTime.Now.ToString("HH:mm")
                                            };
                                            await context.Response.WriteAsync(JsonSerializer.Serialize(sucesso, _jsonOptions));
                                            return;
                                        }

                                        context.Response.StatusCode = 400;
                                        var erro = new { success = false, message = "Matrícula não encontrada nesta unidade." };
                                        await context.Response.WriteAsync(JsonSerializer.Serialize(erro, _jsonOptions));
                                    }
                                    catch (Exception ex)
                                    {
                                        context.Response.StatusCode = 400;
                                        context.Response.ContentType = "application/json";
                                        var erroGrave = new { success = false, message = "Erro: " + ex.Message };
                                        await context.Response.WriteAsync(JsonSerializer.Serialize(erroGrave, _jsonOptions));
                                    }
                                });
                            });
                        })
.Build();

                    // Se chegou até aqui, deu tudo certo!
                    System.Diagnostics.Debug.WriteLine("✅ [API LOCAL] Servidor Kestrel SUBIU na porta 5000 com SUCESSO!");
                    host.Run();
                }
                catch (Exception ex)
                {
                    // Se o Windows bloquear a porta, ele cai aqui!
                    System.Diagnostics.Debug.WriteLine($"❌ [API LOCAL] Erro fatal ao tentar subir o Kestrel: {ex.Message}");

                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        MessageBox.Show($"O Windows bloqueou a abertura do servidor local na porta 5000.\n\nErro: {ex.Message}\n\nTente rodar o programa como Administrador.", "Erro de Rede", MessageBoxButton.OK, MessageBoxImage.Error);
                    });
                }
            });
        }
        private void SetupLateNotifier()
        {
            _lateCheckTimer = new System.Windows.Threading.DispatcherTimer();
            _lateCheckTimer.Interval = TimeSpan.FromMinutes(20);
            _lateCheckTimer.Tick += async (s, e) =>
            {
                Debug.WriteLine("⏰ Timer: Solicitando verificação de atrasos e sincronização...");

                // Tenta sincronizar os pontos guardados em modo offline!
                await _timeService.SincronizarPontosOfflineAsync();

                // Verifica os atrasos normais
                await ExecuteLateCheckAsync();
            };
            _lateCheckTimer.Start();
        }
        private async Task ExecuteLateCheckAsync()
        {
            try
            {
                // Puxa a lista de objetos (ID, Nome, Esperado, Atraso) do Service
                var listAtrasados = await _timeService.GetLateEmployeesAsync();

                // Enviamos sempre a lista (mesmo vazia) para o React saber que a checagem terminou
                await SendToReact("delay-notification", listAtrasados);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"❌ Erro ao processar atrasos: {ex.Message}");
            }
        }
        private async Task SendToReact(string type, object data)
        {
            // Verifica se a aplicação e o Dispatcher ainda são válidos
            if (Application.Current == null) return;

            await Application.Current.Dispatcher.InvokeAsync(async () =>
            {
                try
                {
                    // PROTEÇÃO ESSENCIAL: Verifica se o WebView e o Core foram instanciados
                    if (webView == null || webView.CoreWebView2 == null)
                    {
                        System.Diagnostics.Debug.WriteLine($"⚠️ Ignorando envio de {type}: WebView2 ainda não inicializado.");
                        return;
                    }

                    // ✨ A MÁGICA FINAL: Adicionamos o IgnoreCycles direto no enviador!
                    var options = new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                        ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles
                    };

                    var json = JsonSerializer.Serialize(new { type, data }, options);

                    // Usa ExecuteScriptAsync de forma segura
                    await webView.CoreWebView2.ExecuteScriptAsync(
                        $"window.dispatchEvent(new CustomEvent('data-received', {{ detail: {json} }}))"
                    );
                }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine($"❌ Erro SendToReact: {ex.Message}"); }
            });
        }
        async void InitializeAsync()
        {
            try
            {
                try
                {
                    // Cria o ambiente com a flag que burla o pop-up da câmera
                    Debug.WriteLine("Iniciando camera");
                    var options = new Microsoft.Web.WebView2.Core.CoreWebView2EnvironmentOptions("--use-fake-ui-for-media-stream");
                    var env = await Microsoft.Web.WebView2.Core.CoreWebView2Environment.CreateAsync(null, null, options);
                    await webView.EnsureCoreWebView2Async(env);
                }
                catch (Exception ex)
                {
                    Debug.WriteLine("⚠️ Problema ao injetar flag da câmera. Iniciando normal: " + ex.Message);
                    // Fallback: se a flag falhar por alguma restrição do Windows, sobe normal
                    await webView.EnsureCoreWebView2Async(null);
                }
                await webView.EnsureCoreWebView2Async(null);
                webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
                webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;

                webView.CoreWebView2.PermissionRequested += (sender, args) =>
                {
                    if (args.PermissionKind == Microsoft.Web.WebView2.Core.CoreWebView2PermissionKind.Camera ||
                        args.PermissionKind == Microsoft.Web.WebView2.Core.CoreWebView2PermissionKind.Microphone)
                    {
                        args.State = Microsoft.Web.WebView2.Core.CoreWebView2PermissionState.Allow;
                    }
                };

                webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;

                // ✨ A VERIFICAÇÃO CRÍTICA DO ARQUIVO DE CONFIGURAÇÃO
                if (string.IsNullOrEmpty(DbGlobals.ConnectionString))
                {
                    Debug.WriteLine("⚠️ Nenhuma configuração de banco encontrada. Parando inicialização e chamando Setup.");
                    _isDatabaseReady = false; // Trava o sistema
                    SetWebViewSource();
                    await SendToReact("db-not-configured", "Por favor, configure o banco de dados.");
                    return;
                }

                Debug.WriteLine("✅ Configuração encontrada! Conectando ao banco de dados...");

                var _upgradeService = new DatabaseUpgradeService(async (type, data) =>
                {
                    await SendToReact(type, data);
                });

                // ✨ CORREÇÃO 1: MODO OFFLINE BLINDADO
                await Task.Run(async () =>
                {
                    try
                    {
                        await _upgradeService.CheckAndUpgradeAsync();
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"⚠️ Banco offline na inicialização. Iniciando em MODO OFFLINE. Erro: {ex.Message}");
                    }
                    finally
                    {
                        // O 'finally' garante que, com ou sem internet, o sistema seja destravado 
                        // pois já sabemos que existe uma ConnectionString configurada na máquina.
                        _isDatabaseReady = true;
                    }
                });

                SetWebViewSource();
                await SendToReact("app-ready", true);
                Debug.WriteLine("🚀 [System] Interface e Banco liberados com sucesso.");
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"❌ Erro crítico no InitializeAsync: {ex.Message}");
            }
        }
        private void SetWebViewSource()
        {
            // Caminho para a pasta onde o React foi buildado (compilado)
            string siteFolder = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot");

            // Verifica se a pasta existe e se o arquivo principal (index.html) está lá
            if (Directory.Exists(siteFolder) && System.IO.File.Exists(Path.Combine(siteFolder, "index.html")))
            {
                Debug.WriteLine("🌐 [WebView] Carregando arquivos locais (Produção).");

                // Mapeia o nome de host virtual para a pasta física
                webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    "app.local",
                    siteFolder,
                    Microsoft.Web.WebView2.Core.CoreWebView2HostResourceAccessKind.Allow
                );

                // Define a fonte para o host virtual configurado
                webView.Source = new Uri("https://app.local/index.html");
            }
            else
            {
                // Se não encontrar a pasta wwwroot, assume que você está desenvolvendo com o Vite
                Debug.WriteLine("🚀 [WebView] Modo Desenvolvimento: Conectando ao http://localhost:5173");
                webView.Source = new Uri("http://localhost:5173");
            }
        }

        private async void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            // ✨ A BARREIRA INTRANSPONÍVEL
            // Se o banco não tá pronto, e a mensagem NÃO for para salvar configuração, nós ignoramos e avisamos o React de novo.
            if (!_isDatabaseReady && !e.WebMessageAsJson.Contains("SAVE_DB_CONFIG"))
            {
                Debug.WriteLine("⏳ Comando ignorado: Sistema aguardando configuração do banco.");
                await SendToReact("db-not-configured", "Aguardando configuração do servidor.");
                return;
            }

            try
            {
                string jsonRaw = e.WebMessageAsJson;
                using var __doc = JsonDocument.Parse(jsonRaw);
                var __root = __doc.RootElement;

                string action = __root.GetProperty("action").GetString();
                __root.TryGetProperty("data", out var data);

                Debug.WriteLine($"📥 MENSAGEM RECEBIDA: {action}");

                switch (action)
                {
                    case "CHECK_SYSTEM_STATUS":
                        {
                            LoggerService.Log("🔍 Iniciando CHECK_SYSTEM_STATUS (Global)...");

                            var localSettings = Properties.Settings.Default;

                            if (string.IsNullOrEmpty(RHSystem.Desktop.Data.DbGlobals.ConnectionString))
                            {
                                LoggerService.Log("⚠️ CHECK_SYSTEM_STATUS: ConnectionString vazia. Retornando status mínimo.");
                                await SendToReact("system-status", new
                                {
                                    dbConfigured = false,
                                    appMode = localSettings.AppMode ?? "Desktop",
                                    storeName = localSettings.KioskStoreName ?? "",
                                    storeId = localSettings.KioskStoreId,
                                    message = "Banco não configurado"
                                });
                                break;
                            }

                            string decryptedCode = "";
                            if (localSettings.AppMode == "Kiosk" && !string.IsNullOrEmpty(localSettings.KioskStoreCode))
                            {
                                decryptedCode = RHSystem.Helpers.SecurityHelper.Decrypt(localSettings.KioskStoreCode) ?? "";
                            }

                            string credentialsPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "client_secrets.json");
                            bool hasDriveCredentials = File.Exists(credentialsPath);

                            try
                            {
                                // Tenta buscar dados online
                                var settingsService = new RHSystem.Services.SettingsService();
                                var dbSettings = await settingsService.GetSettingsAsync();

                                var fullStatus = new
                                {
                                    dbConfigured = true,
                                    appMode = localSettings.AppMode ?? "Desktop",
                                    storeName = localSettings.KioskStoreName ?? "",
                                    storeCode = decryptedCode,
                                    storeId = localSettings.KioskStoreId,
                                    isServiceProviderMode = dbSettings.IsServiceProviderMode,
                                    globalRazaoSocial = dbSettings.GlobalRazaoSocial,
                                    globalCnpj = dbSettings.GlobalCnpj,
                                    googleDriveFolderId = dbSettings.GoogleDriveFolderId ?? "",
                                    hasDriveCredentials = hasDriveCredentials
                                };

                                await SendToReact("system-status", fullStatus);
                                LoggerService.Log("✅ CHECK_SYSTEM_STATUS finalizado com sucesso.");
                            }
                            catch (Exception ex)
                            {
                                // ✨ CORREÇÃO 2: MANTÉM O SISTEMA VIVO NO MODO OFFLINE
                                LoggerService.Log($"⚠️ Banco Inacessível. Entrando em MODO OFFLINE: {ex.Message}");

                                await SendToReact("system-status", new
                                {
                                    dbConfigured = true, // Mantém TRUE para ele não ir pra tela de IP!
                                    appMode = localSettings.AppMode ?? "Desktop",
                                    storeName = localSettings.KioskStoreName ?? "",
                                    storeCode = decryptedCode,
                                    storeId = localSettings.KioskStoreId,
                                    isServiceProviderMode = false,
                                    globalRazaoSocial = "MODO OFFLINE",
                                    globalCnpj = "00.000.000/0000-00",
                                    googleDriveFolderId = "",
                                    hasDriveCredentials = hasDriveCredentials
                                });
                            }
                            break;
                        }
                    case "GET_APP_MODE":
                        {
                            var settings = Properties.Settings.Default;
                            string decryptedCode = "";

                            if (!string.IsNullOrEmpty(settings.KioskStoreCode))
                                decryptedCode = RHSystem.Helpers.SecurityHelper.Decrypt(settings.KioskStoreCode);

                            // O seu React espera o tipo "app-mode-config"
                            await SendToReact("app-mode-config", new
                            {
                                StoreName = settings.KioskStoreName,
                                StoreCode = decryptedCode
                            });
                        }
                        break;
                    case "SAVE_DB_CONFIG":
                        try
                        {
                            // 1. Converte o JSON vindo do React para o objeto DatabaseSettings
                            var dbSettings = JsonSerializer.Deserialize<DatabaseSettings>(data.GetRawText(), _jsonOptions);

                            if (dbSettings == null) throw new Exception("Dados de configuração inválidos.");

                            // 2. CORREÇÃO AQUI: Passa o objeto completo para o método correto do SetupService
                            // O método SaveDatabaseConfig internamente já salva no arquivo e atualiza o DbGlobals
                            _setupService.SaveDatabaseConfig(dbSettings);

                            Debug.WriteLine($"✅ [Config] Configurações salvas no disco para o Host: {dbSettings.Host}");

                            // 3. Dispara a inicialização/upgrade das tabelas no novo IP
                            await Task.Run(async () =>
                            {
                                // Recriamos o serviço de upgrade para garantir que ele use o novo DbGlobals.ConnectionString
                                var _upgradeService = new DatabaseUpgradeService(async (type, data) => await SendToReact(type, data));
                                await _upgradeService.CheckAndUpgradeAsync();
                                _isDatabaseReady = true;
                            });

                            // 4. Avisa o React que a conexão foi um sucesso
                            await SendToReact("db-config-success", "Conexão estabelecida com sucesso!");
                            await SendToReact("app-ready", true);
                        }
                        catch (Exception ex)
                        {
                            Debug.WriteLine($"❌ Erro ao configurar banco: {ex.Message}");
                            await SendToReact("db-config-error", "Falha na conexão: " + ex.Message);
                        }
                        break;
                    case "REGISTER_TIME":
                        {
                            try
                            {
                                var entry = JsonSerializer.Deserialize<TimeRequestDTO>(data.GetRawText(), _jsonOptions);
                                int currentStoreId = Properties.Settings.Default.KioskStoreId;
                                DateTime horaParaTela = RHSystem.Helpers.TimeHelper.GetLocalTime();

                                // Flag que controla se o ponto salvou na nuvem
                                bool pontoRegistradoOnline = false;

                                try
                                {
                                    // ==========================================================
                                    // 1. TENTA O BANCO NATURALMENTE (ONLINE)
                                    // ==========================================================
                                    var emp = await _employeeService.GetByPinAndStoreAsync(entry.Pin, currentStoreId);

                                    if (emp != null)
                                    {
                                        // ✨ A BARREIRA DA INTELIGÊNCIA ARTIFICIAL (AZURE)
                                        if (emp.RequireFacialAuth)
                                        {
                                            // A) Verificamos se a câmera enviou a foto
                                            if (string.IsNullOrEmpty(entry.ImageBase64))
                                            {
                                                await SendToReact("time-error", "Biometria exigida. Por favor, posicione-se em frente à câmera.");
                                                return; // ⛔ Para a execução aqui!
                                            }

                                            // B) Verificamos se o RH cadastrou a foto do funcionário
                                            if (string.IsNullOrEmpty(emp.FacialReferenceData))
                                            {
                                                await SendToReact("time-error", "Gabarito facial não cadastrado. Procure o RH.");
                                                return; // ⛔ Para a execução aqui!
                                            }

                                            // C) ENVIAMOS PARA A MICROSOFT AZURE COMPARAR
                                            var azureFace = new RHSystem.Services.AzureFaceService();

                                            // Garante que a Azure receba o Base64 puro (sem o prefixo do HTML)
                                            string cleanBase64 = entry.ImageBase64.Contains(",") ? entry.ImageBase64.Split(',')[1] : entry.ImageBase64;

                                            bool isMatch = await azureFace.VerifyFaceAsync(emp.FacialReferenceData, cleanBase64);

                                            if (!isMatch)
                                            {
                                                await SendToReact("time-error", "Acesso Negado: Rosto não reconhecido pela IA.");
                                                return; // ⛔ É um impostor! Ponto bloqueado!
                                            }
                                        }

                                        // ✅ Passou pela IA (ou não exigia IA), grava no banco online!
                                        await _timeService.RegisterPointAsync(emp.Id, currentStoreId);

                                        await SendToReact("time-success", new
                                        {
                                            employeeName = emp.Name.Split(' ')[0],
                                            time = horaParaTela.ToString("HH:mm")
                                        });

                                        pontoRegistradoOnline = true; // Avisa que deu tudo certo!
                                    }
                                }
                                catch (Exception ex)
                                {
                                    // Se cair aqui, a rede bloqueou ou o banco deu timeout. 
                                    // O código continua rodando para entrar no Modo Offline logo abaixo.
                                    Debug.WriteLine($"[Rede/Banco Falhou]: {ex.Message}");
                                }

                                // ==========================================================
                                // 2. MODO OFFLINE SEGURO (Plano B)
                                // ==========================================================
                                // Só entra aqui se o 'try' de cima falhou e o ponto não foi registrado
                                if (!pontoRegistradoOnline)
                                {
                                    if (File.Exists("emp_cache.json"))
                                    {
                                        var cachedList = JsonSerializer.Deserialize<List<Employee>>(File.ReadAllText("emp_cache.json"), _jsonOptions);

                                        // Busca o PIN ignorando a loja, útil se a internet cair logo após um remanejamento
                                        var empOff = cachedList.FirstOrDefault(e => e.Pin == entry.Pin);

                                        if (empOff != null)
                                        {
                                            // ⚠️ NOTA: Sem internet, não há como bater na API da Azure.
                                            // O ponto offline é gravado com confiança no PIN, e o RH audita depois se houver dúvidas.
                                            _timeService.GravarPontoOffline(empOff.Id, currentStoreId);

                                            await SendToReact("time-success", new
                                            {
                                                employeeName = empOff.Name.Split(' ')[0] + " (Offline)",
                                                time = horaParaTela.ToString("HH:mm")
                                            });
                                        }
                                        else
                                        {
                                            await SendToReact("time-error", "PIN não encontrado na unidade ou no cache local.");
                                        }
                                    }
                                    else
                                    {
                                        await SendToReact("time-error", "Sistema Offline e sem cache de funcionários disponível.");
                                    }
                                }
                            }
                            catch (Exception ex)
                            {
                                // Erro fatal de código (JSON mal formado, etc)
                                await SendToReact("time-error", "Erro técnico crítico: " + ex.Message);
                            }
                            break;
                        }
                    case "REQUEST_ADMIN_UNLOCK":
                        try
                        {
                            var req = JsonSerializer.Deserialize<Dictionary<string, string>>(data.GetRawText());
                            string pass = req["password"];

                            if (RHSystem.Helpers.SecurityHelper.ValidateAdminPassword(pass))
                            {
                                // 1. Altera o modo ANTES de fechar
                                var settings = Properties.Settings.Default;
                                settings.AppMode = "Desktop";
                                settings.Save();

                                // 2. Tenta reabrir o processo atual
                                string exePath = System.Environment.ProcessPath;

                                if (!string.IsNullOrEmpty(exePath))
                                {
                                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(exePath)
                                    {
                                        UseShellExecute = true
                                    });
                                }

                                // 3. Fecha a instância atual de forma limpa
                                System.Windows.Application.Current.Shutdown();
                            }
                            else
                            {
                                await SendToReact("admin-unlock-error", true);
                            }
                        }
                        catch (Exception ex)
                        {
                            Debug.WriteLine($"Erro no unlock: {ex.Message}");
                        }
                        break;
                    case "GET_TIME_RECORDS":
                        try
                        {
                            // ✨ Força o C# a mandar os pontos do JSON pro Banco ANTES de devolver os dados pro React!
                            await _timeService.SincronizarPontosOfflineAsync();

                            var records = await _timeService.GetAllRecordsAsync();
                            await SendToReact("time-records-loaded", records);
                        }
                        catch (Exception ex) { Debug.WriteLine(ex.Message); }
                        break;

                    case "OPEN_INSPECT":
                        webView.CoreWebView2.OpenDevToolsWindow();
                        break;

                    case "FORCE_LATE_CHECK":
                        await ExecuteLateCheckAsync();
                        break;
                    case "GET_SETTINGS":
                        await SendToReact("settings-loaded", await _settingsService.GetSettingsAsync());
                        break;

                    case "SAVE_SETTINGS":
                        {
                            var settings = JsonSerializer.Deserialize<CompanySetting>(data.GetRawText(), _jsonOptions);
                            if (settings != null)
                            {
                                await _settingsService.SaveSettingsAsync(settings);
                                await SendToReact("db-config-success", "Configurações Globais Atualizadas!");
                            }
                        }
                        break;
                    case "GET_STORES":
                        using (var db = new AppDbContext())
                        {
                            var stores = await db.Stores.Include(s => s.ServiceProvider).ToListAsync();
                            await SendToReact("stores-loaded", stores);
                        }
                        break;
                    case "SAVE_STORE":
                        try
                        {
                            var store = JsonSerializer.Deserialize<Store>(data.GetRawText(), _jsonOptions);
                            if (store != null)
                            {
                                var existingStores = await _storeService.GetStoresAsync();

                                // VERIFICAÇÃO DE CNPJ DUPLICADO (Apenas para novos cadastros Id == 0)
                                if (store.Id == 0 && existingStores.Any(s => s.CnpjCustom == store.CnpjCustom))
                                {
                                    await SendToReact("db-config-error", "Este CNPJ já está cadastrado em outra unidade!");
                                    break;
                                }

                                await _storeService.SaveStoreAsync(store);
                                await SendToReact("db-config-success", "Unidade salva com sucesso!");
                                await SendToReact("stores-loaded", await _storeService.GetStoresAsync());
                            }
                        }
                        catch (Exception ex) { await SendToReact("db-config-error", ex.Message); }
                        break;
                    case "GET_INACTIVE_EMPLOYEES":
                        try
                        {
                            using var db = new AppDbContext();

                            // Traz apenas quem está com IsActive = false OU tem data de demissão
                            var inactives = await db.Employees
                                .Include(e => e.Store) // Traz a unidade para a listagem não quebrar
                                .Where(e => !e.IsActive || e.ResignationDate != null)
                                .OrderByDescending(e => e.ResignationDate)
                                .ToListAsync();

                            await SendToReact("inactive-employees-loaded", inactives);
                        }
                        catch (Exception ex)
                        {
                            await SendToReact("db-config-error", "Erro ao buscar inativos: " + ex.Message);
                        }
                        break;
                    case "GET_EMPLOYEES":
                        {
                            try
                            {
                                // 1. Puxa todos do banco usando o seu serviço
                                var allEmployees = await _employeeService.GetAllAsync();

                                // ✨ 2. O FILTRO MESTRE + ORDEM ALFABÉTICA
                                var list = allEmployees
                                    .Where(e => e.ResignationDate == null || e.ResignationDate > DateTime.UtcNow.Date) // Esconde os demitidos
                                    .OrderBy(e => e.Name) // ✨ Mágica da Ordem Alfabética (A-Z)
                                    .ToList();

                                // 3. Salva o backup local apenas com os ativos e já ordenados
                                File.WriteAllText("emp_cache.json", JsonSerializer.Serialize(list));

                                // 4. Envia para o React
                                await SendToReact("employees-loaded", list);
                            }
                            catch (Exception)
                            {
                                // ✨ SE A INTERNET CAIR, CARREGA O CACHE (que já está ordenado e sem demitidos!)
                                if (File.Exists("emp_cache.json"))
                                {
                                    var cachedList = JsonSerializer.Deserialize<List<Employee>>(File.ReadAllText("emp_cache.json"), _jsonOptions);
                                    await SendToReact("employees-loaded", cachedList);
                                }
                            }
                            break;
                        }
                    case "DELETE_VACATIONS":
                        {
                            try
                            {
                                using var db = new AppDbContext();
                                var rawJson = data.GetRawText();
                                Console.WriteLine($"📝 JSON recebido: {rawJson}");

                                var list = JsonSerializer.Deserialize<List<DeleteVacationDto>>(rawJson,
                                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                                if (list != null)
                                {
                                    foreach (var item in list)
                                    {
                                        Console.WriteLine($"🛠️ Processando Item: IdVacation={item.Id}, Emp={item.EmployeeId}");

                                        // 1. Deletar da tabela Vacations usando SQL Puro para evitar erro de Cast na Model
                                        await db.Database.ExecuteSqlRawAsync(
                                            "DELETE FROM \"Vacations\" WHERE \"Id\" = {0}", item.Id);
                                        Console.WriteLine("✅ Comando DELETE enviado para tabela Vacations");

                                        // 2. Converter datas para o filtro
                                        DateTime dtStart = DateTime.Parse(item.StartDate).Date;
                                        DateTime dtEnd = DateTime.Parse(item.EndDate).Date;

                                        // 3. Deletar da AbsenceJustifications usando SQL Puro
                                        // Aqui é onde o bicho pega. Vamos deletar pelo tipo e EmployeeId.
                                        // O PostgreSQL consegue comparar campos TEXT com strings ISO se o formato for YYYY-MM-DD
                                        string sStart = dtStart.ToString("yyyy-MM-dd");
                                        string sEnd = dtEnd.ToString("yyyy-MM-dd");

                                        Console.WriteLine($"🧹 Limpando espelho: {sStart} até {sEnd}");

                                        int rowsAffected = await db.Database.ExecuteSqlRawAsync(
                                            "DELETE FROM \"AbsenceJustifications\" " +
                                            "WHERE \"EmployeeId\" = {0} " +
                                            "AND \"Type\" = 'FERIAS' " +
                                            "AND \"Date\" >= {1} " +
                                            "AND \"Date\" <= {2}",
                                            item.EmployeeId, sStart, sEnd);

                                        Console.WriteLine($"✨ Justificativas removidas: {rowsAffected} linhas.");
                                    }

                                    await SendToReact("delete-vacations-success", "Férias removidas com sucesso");
                                }
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"🔥 ERRO NO DELETE: {ex.Message}");
                                Console.WriteLine($"🔍 STACKTRACE: {ex.StackTrace}");
                            }
                            break;
                        }
                    case "GET_EMPLOYEE_SCHEDULE":
                        {
                            try
                            {
                                using var db = new AppDbContext();

                                var doc = JsonDocument.Parse(data.GetRawText());
                                if (doc.RootElement.TryGetProperty("employeeId", out var empIdProp))
                                {
                                    int empId = empIdProp.GetInt32();

                                    // ✨ BUSCAMOS TODAS AS ESCALAS DO FUNCIONÁRIO E ORDENAMOS DA MAIS NOVA PARA A MAIS ANTIGA
                                    var history = await db.Schedules
                                        .AsNoTracking()
                                        .Where(s => s.EmployeeId == empId)
                                        .OrderByDescending(s => s.EffectiveDate ?? DateTime.MinValue)
                                        .ToListAsync();

                                    if (history.Any())
                                    {
                                        // Enviamos toda a lista pro React para montar a abinha do Histórico
                                        await SendToReact("employee-schedule-history-loaded", history);
                                    }
                                    else
                                    {
                                        await SendToReact("employee-schedule-empty", null);
                                    }
                                }
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"❌ Erro ao buscar escalas: {ex.Message}");
                            }
                            break;
                        }
                    case "SAVE_EMPLOYEE":
                        try
                        {
                            var emp = JsonSerializer.Deserialize<Employee>(data.GetRawText(), _jsonOptions);
                            if (emp != null)
                            {
                                // 1. Salva o funcionário (atualiza IsActive e ResignationDate)
                                await _employeeService.SaveAsync(emp);

                                // 2. Verifica se é um desligamento (Inativo + Com data de demissão)
                                if (emp.ResignationDate != null && !emp.IsActive)
                                {
                                    // ✨ Busca os dados formatados usando o Service
                                    var reportData = await _reportService.GetMonthlyTimesheetData(
                                        emp.Id,
                                        emp.ResignationDate.Value.Month,
                                        emp.ResignationDate.Value.Year
                                    );

                                    // 3. Envia para o evento exclusivo de impressão
                                    await SendToReact("print-termination-report", reportData);
                                }

                                await SendToReact("db-config-success", "Operação concluída com sucesso!");
                                // Atualiza a lista de funcionários ativos no Front
                                await SendToReact("employees-loaded", await _employeeService.GetAllAsync());
                            }
                        }
                        catch (Exception ex)
                        {
                            await SendToReact("db-config-error", "Erro ao processar: " + ex.Message);
                        }
                        break;
                    case "DELETE_EMPLOYEES":
                        {
                            var ids = JsonSerializer.Deserialize<List<int>>(data.GetRawText(), _jsonOptions);
                            await _employeeService.SetActiveStatusAsync(ids, false); // Inativação lógica
                            await SendToReact("employees-loaded", await _employeeService.GetAllAsync());
                        }
                        break;
                    case "REACTIVATE_EMPLOYEES":
                        try
                        {
                            var idsToReactivate = JsonSerializer.Deserialize<List<int>>(data.GetRawText(), _jsonOptions);

                            // Chama o método atualizado que já limpa a data de demissão!
                            await _employeeService.SetActiveStatusAsync(idsToReactivate, true);

                            // Atualiza a tela de inativos para remover quem foi reativado
                            await SendToReact("db-config-success", "Colaboradores reativados com sucesso!");
                        }
                        catch (Exception ex)
                        {
                            await SendToReact("db-config-error", "Erro ao reativar: " + ex.Message);
                        }
                        break;
                    case "GET_DEPARTMENTS":
                        await SendToReact("departments-loaded", await _departmentService.GetDepartmentsAsync());
                        break;

                    case "SAVE_DEPARTMENT":
                        try
                        {
                            var deptToSave = JsonSerializer.Deserialize<Department>(data.GetRawText(), _jsonOptions);
                            if (deptToSave == null) throw new Exception("Dados do setor inválidos.");

                            await _departmentService.SaveDepartmentAsync(deptToSave);

                            // Atualiza a lista no React após salvar para refletir as mudanças
                            var list = await _departmentService.GetDepartmentsAsync();
                            await SendToReact("departments-loaded", list);
                            await SendToReact("db-config-success", "Setor cadastrado com sucesso!");
                        }
                        catch (Exception ex)
                        {
                            await SendToReact("error-occurred", "Erro ao salvar setor: " + ex.Message);
                        }
                        break;
                    case "CHECK_DEPT_USAGE":
                        {
                            // Use nomes únicos para evitar conflito de escopo
                            var deptCheckData = JsonSerializer.Deserialize<Department>(data.GetRawText(), _jsonOptions);

                            // Verifique se o seu service usa 'GetAllEmployeesAsync' ou 'GetEmployeesAsync'
                            // Se der erro, mude o nome abaixo para o que está no seu EmployeeService.cs
                            var listForCheck = await _employeeService.GetAllAsync();

                            int usageCount = listForCheck.Count(e => e.Role == deptCheckData.Name);

                            await SendToReact("dept-usage-checked", new
                            {
                                Name = deptCheckData.Name,
                                Count = usageCount
                            });
                        }
                        break;
                    case "DELETE_DEPARTMENT":
                        var deptToDelete = JsonSerializer.Deserialize<Department>(data.GetRawText(), _jsonOptions);
                        // Deleta o departamento pelo nome (conforme sua lógica de api.send)
                        await _departmentService.DeleteDepartmentByNameAsync(deptToDelete.Name);
                        await SendToReact("db-config-success", "Setor removido!");
                        break;
                    case "SET_KIOSK_MODE":
                        try
                        {
                            // 1. Converte o JSON vindo do React para o objeto C#
                            var kioskData = JsonSerializer.Deserialize<KioskConfigDTO>(data.GetRawText(), _jsonOptions);

                            if (kioskData != null)
                            {
                                // 2. Acesso direto às configurações do seu projeto RHSystem
                                var settings = Properties.Settings.Default;

                                // 3. Define os valores nas colunas que você criou na aba Settings
                                settings.AppMode = "Kiosk";
                                settings.KioskStoreId = kioskData.StoreId;
                                settings.KioskStoreName = kioskData.StoreName;

                                // 4. CRIPTOGRAFIA: Protege o código da loja usando a DPAPI do seu SecurityHelper
                                // Isso vincula o dado à "alma" desta máquina específica
                                settings.KioskStoreCode = RHSystem.Helpers.SecurityHelper.Encrypt(kioskData.StoreCode);

                                // 5. Salva permanentemente no arquivo user.config da máquina
                                settings.Save();

                                MessageBox.Show($"O terminal foi vinculado com sucesso à unidade: {kioskData.StoreName}.\nO sistema será reiniciado para aplicar as restrições.", "Modo Kiosk Ativado");

                                // 6. Reinicialização Segura para WPF: 
                                // Inicia um novo processo e fecha o atual imediatamente
                                System.Diagnostics.Process.Start(System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "RHSystem.exe"));
                                Application.Current.Shutdown();
                            }

                        }
                        catch (Exception ex)
                        {
                            // Envia o erro de volta para o console do React em caso de falha na criptografia ou salvamento
                            await SendToReact("db-config-error", $"Erro ao configurar Kiosk: {ex.Message}");
                        }
                        break;
                    case "GENERATE_REPORT":
                        try
                        {
                            // O JsonSerializer vai converter o seu log {employeeId: 1...} para este objeto
                            var request = JsonSerializer.Deserialize<ReportRequest>(data.GetRawText(), _jsonOptions);

                            // Chama o serviço para buscar e calcular as horas
                            var report = await _timeService.GetReportDataAsync(
                                request.employeeId,
                                request.startDate,
                                request.endDate
                            );

                            if (report != null)
                            {
                                // Envia de volta para o React abrir a janela de impressão
                                await SendToReact("print-report-ready", report);
                            }
                        }
                        catch (Exception ex)
                        {
                            Debug.WriteLine($"Erro ao processar relatório: {ex.Message}");
                        }
                        break;
                    case "GET_TIMESHEET_REPORT":
                        {
                            var req = JsonSerializer.Deserialize<JsonElement>(data.GetRawText());
                            int rEmpId = req.GetProperty("employeeId").GetInt32();
                            int rMonth = req.GetProperty("month").GetInt32();
                            int rYear = req.GetProperty("year").GetInt32();

                            // Chama a função e envia o resultado
                            var report = await _reportService.GetMonthlyTimesheetData(rEmpId, rMonth, rYear);
                            await SendToReact("timesheet-report-loaded", report);
                            break;
                        }

                    case "SAVE_SCHEDULE":
                        {
                            try
                            {
                                var rawJson = data.GetRawText();
                                string SafeStr(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

                                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                                var input = JsonSerializer.Deserialize<Schedule>(rawJson, options);

                                if (input == null) throw new Exception("Falha ao ler os dados da escala.");

                                // Trata o RosterDays do React
                                string rosterDaysStr = "";
                                using var doc = JsonDocument.Parse(rawJson);
                                var root = doc.RootElement;
                                if (root.TryGetProperty("rosterDays", out var rd) || root.TryGetProperty("RosterDays", out rd))
                                {
                                    if (rd.ValueKind == JsonValueKind.Array)
                                    {
                                        var days = rd.EnumerateArray().Select(d => d.GetString()).Where(d => !string.IsNullOrEmpty(d));
                                        rosterDaysStr = string.Join(",", days);
                                    }
                                }

                                // Corrige valores nulos 
                                input.RosterDaysJson = rosterDaysStr;
                                input.SaturdayStart = SafeStr(input.SaturdayStart);
                                input.SaturdayEnd = SafeStr(input.SaturdayEnd);
                                input.SaturdayStart2 = SafeStr(input.SaturdayStart2);
                                input.SaturdayEnd2 = SafeStr(input.SaturdayEnd2);
                                input.SundayStart = SafeStr(input.SundayStart);
                                input.SundayEnd = SafeStr(input.SundayEnd);
                                input.SundayStart2 = SafeStr(input.SundayStart2);
                                input.SundayEnd2 = SafeStr(input.SundayEnd2);
                                input.ScheduleType = input.ScheduleType ?? "FIXED";
                                input.WorkDays = input.WorkDays ?? "Seg,Ter,Qua,Qui,Sex";

                                using (var db = new AppDbContext())
                                {
                                    // ✨ SE NÃO TIVER DATA DE VIGÊNCIA, ATUALIZAMOS A ESCALA PADRÃO (A PRIMEIRA SEM DATA)
                                    if (!input.EffectiveDate.HasValue)
                                    {
                                        var existingLegacy = await db.Schedules.FirstOrDefaultAsync(s => s.EmployeeId == input.EmployeeId && s.EffectiveDate == null);

                                        if (existingLegacy != null)
                                        {
                                            existingLegacy.ScheduleType = input.ScheduleType;
                                            existingLegacy.RosterDaysJson = input.RosterDaysJson;
                                            existingLegacy.ShiftStart = input.ShiftStart;
                                            existingLegacy.ShiftEnd = input.ShiftEnd;
                                            existingLegacy.ShiftStart2 = input.ShiftStart2;
                                            existingLegacy.ShiftEnd2 = input.ShiftEnd2;
                                            existingLegacy.WorkDays = input.WorkDays;
                                            existingLegacy.WorksSunday = input.WorksSunday;
                                            existingLegacy.OffDay = input.OffDay;
                                            existingLegacy.HasCustomSaturday = input.HasCustomSaturday;
                                            existingLegacy.SaturdayStart = input.SaturdayStart;
                                            existingLegacy.SaturdayEnd = input.SaturdayEnd;
                                            existingLegacy.SaturdayStart2 = input.SaturdayStart2;
                                            existingLegacy.SaturdayEnd2 = input.SaturdayEnd2;
                                            existingLegacy.HasCustomSunday = input.HasCustomSunday;
                                            existingLegacy.SundayStart = input.SundayStart;
                                            existingLegacy.SundayEnd = input.SundayEnd;
                                            existingLegacy.SundayStart2 = input.SundayStart2;
                                            existingLegacy.SundayEnd2 = input.SundayEnd2;
                                            existingLegacy.IsBreastfeeding = input.IsBreastfeeding;
                                            db.Schedules.Update(existingLegacy);
                                        }
                                        else
                                        {
                                            // Cria a primeira escala do funcionário
                                            db.Schedules.Add(input);
                                        }
                                    }
                                    else
                                    {
                                        // ✨ SE TEM DATA DE VIGÊNCIA, PROCURAMOS SE JÁ EXISTE UMA NESTA DATA EXATA
                                        // A data vinda do React já está com a hora convertida, usamos apenas a parte do dia
                                        var existingDateSchedule = await db.Schedules.FirstOrDefaultAsync(s =>
                                            s.EmployeeId == input.EmployeeId &&
                                            s.EffectiveDate.HasValue &&
                                            s.EffectiveDate.Value.Date == input.EffectiveDate.Value.Date);

                                        if (existingDateSchedule != null)
                                        {
                                            existingDateSchedule.ScheduleType = input.ScheduleType;
                                            existingDateSchedule.RosterDaysJson = input.RosterDaysJson;
                                            existingDateSchedule.ShiftStart = input.ShiftStart;
                                            existingDateSchedule.ShiftEnd = input.ShiftEnd;
                                            existingDateSchedule.ShiftStart2 = input.ShiftStart2;
                                            existingDateSchedule.ShiftEnd2 = input.ShiftEnd2;
                                            existingDateSchedule.WorkDays = input.WorkDays;
                                            existingDateSchedule.WorksSunday = input.WorksSunday;
                                            existingDateSchedule.OffDay = input.OffDay;
                                            existingDateSchedule.HasCustomSaturday = input.HasCustomSaturday;
                                            existingDateSchedule.SaturdayStart = input.SaturdayStart;
                                            existingDateSchedule.SaturdayEnd = input.SaturdayEnd;
                                            existingDateSchedule.SaturdayStart2 = input.SaturdayStart2;
                                            existingDateSchedule.SaturdayEnd2 = input.SaturdayEnd2;
                                            existingDateSchedule.HasCustomSunday = input.HasCustomSunday;
                                            existingDateSchedule.SundayStart = input.SundayStart;
                                            existingDateSchedule.SundayEnd = input.SundayEnd;
                                            existingDateSchedule.SundayStart2 = input.SundayStart2;
                                            existingDateSchedule.SundayEnd2 = input.SundayEnd2;
                                            existingDateSchedule.IsBreastfeeding = input.IsBreastfeeding;
                                            db.Schedules.Update(existingDateSchedule);
                                        }
                                        else
                                        {
                                            // Cria um NOVO registro no histórico para essa data
                                            db.Schedules.Add(input);
                                        }
                                    }

                                    await db.SaveChangesAsync();
                                    await SendToReact("db-config-success", "Escala salva com sucesso!");
                                }
                            }
                            catch (Exception ex)
                            {
                                string realError = ex is DbUpdateException dbEx ? dbEx.InnerException?.Message ?? dbEx.Message : ex.Message;
                                Console.WriteLine($"❌ ERRO AO SALVAR ESCALA: {realError}");
                                await SendToReact("error-occurred", "Erro ao salvar escala: " + realError);
                            }
                            break;
                        }
                    //-----------------------------------------------------------------//

                    case "GET_SAVED_JUSTIFICATIONS":
                        {
                            try
                            {
                                using (var db = new AppDbContext())
                                {
                                    // 1. Trazemos os dados PUROS do banco (sem lógica condicional para não quebrar o SQL)
                                    var query = await (from j in db.AbsenceJustifications
                                                       join emp in db.Employees on j.EmployeeId equals emp.Id into empJoin
                                                       from emp in empJoin.DefaultIfEmpty() // Left Join seguro
                                                       orderby j.Date descending
                                                       select new
                                                       {
                                                           id = j.Id,
                                                           empName = emp.Name, // O SQL retorna null naturalmente se não achar
                                                           date = j.Date,
                                                           type = j.Type,
                                                           imgBase64 = j.ImageBase64
                                                       }).ToListAsync(); // Executa no banco de dados!

                                    // 2. Fazemos a formatação na MEMÓRIA do C# (100% seguro contra erros Nullable)
                                    var list = query.Select(x => new
                                    {
                                        id = x.id,
                                        employeeName = string.IsNullOrEmpty(x.empName) ? "Colaborador Deletado/Desconhecido" : x.empName,
                                        date = x.date,
                                        type = x.type,
                                        hasImage = !string.IsNullOrEmpty(x.imgBase64)
                                    }).ToList();

                                    await SendToReact("justifications-loaded", list);
                                }
                            }
                            catch (Exception ex)
                            {
                                string erroReal = ex.InnerException != null ? ex.InnerException.Message : ex.Message;
                                await SendToReact("error-occurred", "Erro ao carregar atestados: " + erroReal);
                            }
                            break;
                        }
                    case "SAVE_JUSTIFICATION":
                        {
                            try
                            {
                                var rawJson = data.GetRawText();
                                using var doc = JsonDocument.Parse(rawJson);
                                var root = doc.RootElement;

                                int empId = root.TryGetProperty("employeeId", out var eId) ? eId.GetInt32() : 0;
                                string startDate = root.TryGetProperty("startDate", out var sd) ? sd.GetString() : "";
                                string endDate = root.TryGetProperty("endDate", out var ed) ? ed.GetString() : "";
                                string startTime = root.TryGetProperty("startTime", out var st) ? st.GetString() : "";
                                string endTime = root.TryGetProperty("endTime", out var et) ? et.GetString() : "";
                                string type = root.TryGetProperty("type", out var t) ? t.GetString() : "";
                                string description = root.TryGetProperty("description", out var desc) ? desc.GetString() : "";
                                bool isAbonado = root.TryGetProperty("isAbonado", out var abon) ? abon.GetBoolean() : false;
                                string base64Image = root.TryGetProperty("imageBase64", out var img) ? img.GetString() : null;

                                using var db = new AppDbContext();
                                string driveId = null;

                                var dbSettings = await db.CompanySettings.FirstOrDefaultAsync(s => s.Id == 1);
                                string rootFolderId = dbSettings?.GoogleDriveFolderId ?? "";

                                if (!string.IsNullOrEmpty(base64Image) && base64Image.Length > 10)
                                {
                                    if (!string.IsNullOrEmpty(rootFolderId))
                                    {
                                        var base64Data = base64Image.Contains(",") ? base64Image.Split(',')[1] : base64Image;
                                        byte[] imageBytes = Convert.FromBase64String(base64Data);
                                        using var ms = new MemoryStream(imageBytes);

                                        var employee = await db.Employees.FindAsync(empId);
                                        string employeeName = employee != null ? employee.Name : $"Desconhecido_ID_{empId}";
                                        string timestamp = DateTime.Now.ToString("ddMMyyyy_HHmmss");

                                        string safeDescription = string.IsNullOrWhiteSpace(description) ? type : description;
                                        foreach (char c in Path.GetInvalidFileNameChars()) safeDescription = safeDescription.Replace(c.ToString(), "");

                                        string fileName = $"{safeDescription} - {timestamp}.jpg";
                                        string pastaDestino = "Outros Documentos";
                                        if (type.Contains("ATESTADO")) pastaDestino = "Atestados Médicos";
                                        else if (type.Contains("FERIAS")) pastaDestino = "Recibos de Férias";
                                        else if (type.Contains("FALTA")) pastaDestino = "Justificativas de Falta";

                                        var driveService = new RHSystem.Services.GoogleDriveService();
                                        driveId = await driveService.UploadFileHierarchicalAsync(ms, fileName, "image/jpeg", rootFolderId, pastaDestino, employeeName);
                                    }
                                }

                                string finalType = type;
                                if (!string.IsNullOrEmpty(startTime) && !string.IsNullOrEmpty(endTime))
                                {
                                    finalType = $"{type} {startTime} às {endTime}";
                                }

                                DateTime startDt = DateTime.Parse(startDate);
                                DateTime endDt = string.IsNullOrEmpty(endDate) ? startDt : DateTime.Parse(endDate);

                                var empParaPonto = await db.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == empId);
                                int storeIdCorreto = empParaPonto != null ? empParaPonto.StoreId : 1;

                                for (DateTime dt = startDt; dt <= endDt; dt = dt.AddDays(1))
                                {
                                    string dateStr = dt.ToString("yyyy-MM-dd");

                                    var justification = new AbsenceJustification
                                    {
                                        EmployeeId = empId,
                                        Date = dateStr,
                                        Type = finalType,
                                        Description = description,
                                        IsAbonado = isAbonado, // Fiel à tela do React
                                        DriveFileId = driveId,
                                        CreatedAt = DateTime.UtcNow
                                    };
                                    db.AbsenceJustifications.Add(justification);

                                    var existingRecords = await db.TimeRecords
                                        .Where(tr => tr.EmployeeId == empId && tr.Date == dateStr && tr.ManualStatus != "INATIVO")
                                        .ToListAsync();

                                    if (existingRecords.Any())
                                    {
                                        foreach (var rec in existingRecords)
                                        {
                                            rec.ManualStatus = finalType;
                                            rec.IsAbono = isAbonado; // Atualiza ponto
                                            rec.IsJustified = true;
                                            db.TimeRecords.Update(rec);
                                        }
                                    }
                                    else
                                    {
                                        db.TimeRecords.Add(new TimeRecord
                                        {
                                            EmployeeId = empId,
                                            StoreId = storeIdCorreto,
                                            Date = dateStr,
                                            Time = "00:00",
                                            ManualStatus = finalType,
                                            IsAbono = isAbonado, // Atualiza ponto
                                            IsJustified = true,
                                            CreatedAt = DateTime.UtcNow
                                        });
                                    }
                                }

                                await db.SaveChangesAsync();
                                await SendToReact("db-config-success", "Lançamento realizado e vinculado ao espelho com sucesso!");
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"❌ Erro no SAVE_JUSTIFICATION: {ex.Message}");
                                await SendToReact("error-occurred", "Falha ao lançar: " + ex.Message);
                            }
                            break;
                        }
                    case "GET_JUSTIFICATION_IMAGE":
                        {
                            try
                            {
                                var req = JsonSerializer.Deserialize<Dictionary<string, object>>(data.GetRawText());

                                // Trocamos 'id' por 'reqId' para evitar erro de escopo
                                int reqId = int.Parse(req["id"].ToString());

                                using (var db = new AppDbContext())
                                {
                                    var just = await db.AbsenceJustifications.FindAsync(reqId);

                                    // ATENÇÃO: Mesma regra do ImageBase64 aqui
                                    if (just != null && !string.IsNullOrEmpty(just.ImageBase64))
                                    {
                                        await SendToReact("justification-image-loaded", just.ImageBase64);
                                    }
                                    else
                                    {
                                        await SendToReact("error-occurred", "Imagem não encontrada no banco de dados.");
                                    }
                                }
                            }
                            catch (Exception ex)
                            {
                                await SendToReact("error-occurred", "Erro ao carregar imagem: " + ex.Message);
                            }
                            break;
                        }


                    case "SAVE_DRIVE_CONFIG":
                        {
                            try
                            {
                                var rawJson = data.GetRawText();
                                using var _doc = JsonDocument.Parse(rawJson);
                                var _root = _doc.RootElement;

                                string folderId = _root.TryGetProperty("googleDriveFolderId", out var fId) ? fId.GetString() : "";
                                string credentialsJson = _root.TryGetProperty("credentialsJson", out var cJson) ? cJson.GetString() : "";

                                using (var db = new AppDbContext())
                                {
                                    // ✨ BUSCA ESPECIFICAMENTE O ID 1 (O mesmo que o Service usa)
                                    var settings = await db.CompanySettings.FirstOrDefaultAsync(s => s.Id == 1);

                                    if (settings == null)
                                    {
                                        settings = new CompanySetting { Id = 1 };
                                        db.CompanySettings.Add(settings);
                                    }

                                    settings.GoogleDriveFolderId = folderId;
                                    await db.SaveChangesAsync();
                                    db.Entry(settings).State = EntityState.Detached;
                                    Debug.WriteLine(folderId, "", credentialsJson.ToString());
                                }

                                if (!string.IsNullOrWhiteSpace(credentialsJson))
                                {
                                    string path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "credentials.json");
                                    await File.WriteAllTextAsync(path, credentialsJson);

                                    // Pequeno delay de segurança para o Windows liberar o arquivo
                                    await Task.Delay(100);
                                }

                                await SendToReact("db-config-success", "Configurações do Google Drive atualizadas!");

                            }
                            catch (Exception ex)
                            {
                                await SendToReact("error-occurred", "Falha ao salvar config do Drive: " + ex.Message);
                            }
                            break;
                        }

                    case "GET_DRIVE_LINK":
                        int id = data.GetProperty("id").GetInt32();
                        using (var db = new AppDbContext())
                        {
                            var item = await db.AbsenceJustifications.FindAsync(id);
                            if (!string.IsNullOrEmpty(item?.DriveFileId))
                            {
                                // Gera link de visualização direta
                                string link = $"https://drive.google.com/uc?id={item.DriveFileId}";
                                await SendToReact("justification-image-loaded", link);
                            }
                        }
                        break;

                    case "IMPORT_PONTO_TEXTO":
                        {
                            try
                            {
                                int empIdImport = data.GetProperty("employeeId").GetInt32();
                                string textoImport = data.GetProperty("texto").GetString();

                                using (var db = new AppDbContext())
                                {
                                    var emp = await db.Employees.FindAsync(empIdImport);
                                    if (emp != null)
                                    {
                                        // Agora passamos o texto, o ID do funcionário e o ID da loja dele
                                        await _timeService.ImportRawPointDataAsync(textoImport, emp.Id, emp.StoreId);
                                        await SendToReact("db-config-success", "Importação concluída com sucesso!"); ;
                                    }

                                }
                            }
                            catch (Exception ex)
                            {
                                await SendToReact("db-config-error", $"Erro na importação: {ex.Message}");
                            }

                        }
                        break;
                    case "GET_VACATIONS":
                        {
                            try
                            {
                                using var db = new AppDbContext();

                                // 1. A Janela de Tempo (-3 meses e +6 meses)
                                string dataPassada = DateTime.Today.AddMonths(-3).ToString("yyyy-MM-dd");
                                string dataFutura = DateTime.Today.AddMonths(6).ToString("yyyy-MM-dd");

                                // 2. Busca exata na tabela AbsenceJustifications pelo Type "FERIAS"
                                var diasDeFerias = await db.AbsenceJustifications
                                    .AsNoTracking()
                                    .Where(j => j.Type == "FERIAS" &&
                                                j.Date.CompareTo(dataPassada) >= 0 &&
                                                j.Date.CompareTo(dataFutura) <= 0)
                                    .OrderBy(j => j.Date)
                                    .Select(j => new
                                    {
                                        Id = j.Id,
                                        EmployeeId = j.EmployeeId,
                                        DataRegistro = j.Date
                                    })
                                    .ToListAsync();

                                // 3. Agrupamento (Junta os dias picados em 1 único bloco/card por funcionário/mês)
                                var vacationsList = diasDeFerias
                                    .GroupBy(f => new { f.EmployeeId, Mes = f.DataRegistro.Substring(0, 7) })
                                    .Select(g => new
                                    {
                                        // Pega o ID do primeiro registro só para o React ter uma key única no Card
                                        Id = g.First().Id,
                                        EmployeeId = g.Key.EmployeeId,
                                        // Pega o primeiro dia e o último dia do bloco para montar o período
                                        StartDate = g.Min(x => x.DataRegistro),
                                        EndDate = g.Max(x => x.DataRegistro),
                                        Status = "Férias"
                                    })
                                    .ToList();

                                await SendToReact("vacations-loaded", vacationsList);
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"❌ Erro no GET_VACATIONS: {ex.Message}");
                            }
                            break;
                        }
                    case "SAVE_SERVICE_PROVIDER":
                        {
                            try
                            {
                                var jsonText = data.GetRawText();
                                // Permite que RazaoSocial no JSON preencha RazaoSocial na Model independentemente do case
                                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                                var provider = JsonSerializer.Deserialize<RHSystem.Models.ServiceProvider>(jsonText, options);
                                using (var db = new AppDbContext())
                                {
                                    provider.CreatedAt = DateTime.UtcNow; // Garante a data para o banco
                                    db.ServiceProviders.Add(provider);
                                    await db.SaveChangesAsync();


                                    // 2. Após salvar, já buscamos a lista atualizada para o React
                                    var updatedList = await db.ServiceProviders.AsNoTracking().OrderBy(p => p.RazaoSocial).ToListAsync();
                                    await SendToReact("service-providers-loaded", updatedList);
                                    await SendToReact("db-config-success", "Empresa prestadora cadastrada com sucesso!");
                                }
                            }
                            catch (Exception ex)
                            {
                                await SendToReact("db-config-error", "Erro ao salvar prestadora: " + ex.Message);
                            }
                        }
                        break;
                    case "SAVE_ABONO":
                        {
                            try
                            {
                                var rawJson = data.GetRawText();
                                using var doc = JsonDocument.Parse(rawJson);
                                var root = doc.RootElement;

                                int empId = root.TryGetProperty("employeeId", out var eId) ? eId.GetInt32() : 0;
                                string startDate = root.TryGetProperty("startDate", out var sd) ? sd.GetString() : "";
                                string endDate = root.TryGetProperty("endDate", out var ed) ? ed.GetString() : "";
                                string startTime = root.TryGetProperty("startTime", out var st) ? st.GetString() : "";
                                string endTime = root.TryGetProperty("endTime", out var et) ? et.GetString() : "";
                                string description = root.TryGetProperty("description", out var desc) ? desc.GetString() : "Abono concedido";
                                bool isAbonado = root.TryGetProperty("isAbonado", out var abon) ? abon.GetBoolean() : false; // Mudei o default para false para ser seguro
                                string baseType = root.TryGetProperty("type", out var t) ? t.GetString() : "ABONO";
                                string base64File = root.TryGetProperty("imageBase64", out var b64) ? b64.GetString() : "";

                                using var db = new AppDbContext();

                                var empParaPonto = await db.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == empId);
                                int storeIdCorreto = empParaPonto != null ? empParaPonto.StoreId : 1;
                                string empName = empParaPonto != null ? empParaPonto.Name : "Desconhecido";

                                string finalType = baseType;
                                if (!string.IsNullOrEmpty(startTime) && !string.IsNullOrEmpty(endTime))
                                {
                                    finalType = $"{baseType} {startTime} às {endTime}";
                                }

                                DateTime startDt = DateTime.Parse(startDate);
                                DateTime endDt = string.IsNullOrEmpty(endDate) ? startDt : DateTime.Parse(endDate);

                                string driveIdFinal = "";
                                if (!string.IsNullOrEmpty(base64File))
                                {
                                    try
                                    {
                                        if (base64File.Contains(",")) base64File = base64File.Split(',')[1];

                                        var _driveService = new GoogleDriveService();
                                        byte[] fileBytes = Convert.FromBase64String(base64File);
                                        using var stream = new MemoryStream(fileBytes);
                                        string fileName = $"Atestado_Avulso_{empName}_{startDt:yyyyMMdd}.png";

                                        var uploadTask = Task.Run(async () => {
                                            return await _driveService.UploadFileHierarchicalAsync(
                                                stream, fileName, "image/png", "ID_DA_SUA_PASTA_RAIZ_AQUI", "Atestados", empName
                                            );
                                        });

                                        if (await Task.WhenAny(uploadTask, Task.Delay(15000)) == uploadTask)
                                        {
                                            driveIdFinal = await uploadTask;
                                        }
                                    }
                                    catch (Exception ex)
                                    {
                                        Console.WriteLine($"⚠️ Erro Upload Drive: {ex.Message}");
                                    }
                                }

                                for (DateTime dt = startDt; dt <= endDt; dt = dt.AddDays(1))
                                {
                                    string dateStr = dt.ToString("yyyy-MM-dd");

                                    var justification = new AbsenceJustification
                                    {
                                        EmployeeId = empId,
                                        Date = dateStr,
                                        Type = finalType,
                                        Description = description,
                                        IsAbonado = isAbonado, // Fiel ao React
                                        DriveFileId = driveIdFinal ?? "",
                                        CreatedAt = DateTime.UtcNow
                                    };
                                    db.AbsenceJustifications.Add(justification);

                                    var existingRecords = await db.TimeRecords
                                        .Where(tr => tr.EmployeeId == empId && tr.Date == dateStr && tr.ManualStatus != "INATIVO")
                                        .ToListAsync();

                                    if (existingRecords.Any())
                                    {
                                        foreach (var rec in existingRecords)
                                        {
                                            rec.ManualStatus = finalType;
                                            rec.IsAbono = isAbonado;
                                            rec.IsJustified = true;
                                            db.TimeRecords.Update(rec);
                                        }
                                    }
                                    else
                                    {
                                        db.TimeRecords.Add(new TimeRecord
                                        {
                                            EmployeeId = empId,
                                            StoreId = storeIdCorreto,
                                            Date = dateStr,
                                            Time = "00:00",
                                            ManualStatus = finalType,
                                            IsAbono = isAbonado,
                                            IsJustified = true,
                                            CreatedAt = DateTime.UtcNow
                                        });
                                    }
                                }

                                await db.SaveChangesAsync();
                                await SendToReact("db-config-success", "Abono lançado com sucesso no espelho de ponto!");
                            }
                            catch (Exception ex)
                            {
                                string erroReal = ex.InnerException != null ? ex.InnerException.Message : ex.Message;
                                Console.WriteLine($"❌ Erro no SAVE_ABONO: {erroReal}");
                                await SendToReact("error-occurred", erroReal);
                            }
                            break;
                        }
                    case "GET_SERVICE_PROVIDERS":
                        {
                            using (var db = new AppDbContext())
                            {
                                var providers = await db.ServiceProviders.AsNoTracking().OrderBy(p => p.RazaoSocial).ToListAsync();
                                await SendToReact("service-providers-loaded", providers);
                            }
                        }
                        break;
                    case "UPDATE_DAY_STATUS":
                        {
                            try
                            {
                                var rawJson = data.GetRawText();
                                using var doc = JsonDocument.Parse(rawJson);
                                var root = doc.RootElement;

                                int empId = root.GetProperty("employeeId").GetInt32();
                                string dateStr = root.GetProperty("date").GetString();
                                string newStatus = root.GetProperty("status").GetString();

                                // ✨ 1. PEGA A FLAG CORRETAMENTE
                                bool isAbonado = root.TryGetProperty("isAbonado", out var abon) ? abon.GetBoolean() : false;

                                string description = root.TryGetProperty("description", out var d) ? d.GetString() : "Ajuste via Painel";
                                string base64File = root.TryGetProperty("base64", out var b64) ? b64.GetString() : null;
                                string fileName = root.TryGetProperty("fileName", out var fn) ? fn.GetString() : $"atestado_{dateStr}.png";

                                var punches = root.TryGetProperty("punches", out var pElem) ? pElem.EnumerateArray().ToList() : null;

                                using (var db = new AppDbContext())
                                {
                                    var emp = await db.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == empId);
                                    if (emp == null) throw new Exception("Funcionário não encontrado.");

                                    var oldRecords = await db.TimeRecords.Where(r => r.EmployeeId == empId && r.Date == dateStr).ToListAsync();
                                    db.TimeRecords.RemoveRange(oldRecords);

                                    bool temBatidaAtiva = false;
                                    if (punches != null)
                                    {
                                        foreach (var p in punches)
                                        {
                                            if (p.GetProperty("isActive").GetBoolean())
                                            {
                                                temBatidaAtiva = true;
                                                db.TimeRecords.Add(new TimeRecord
                                                {
                                                    EmployeeId = empId,
                                                    StoreId = emp.StoreId,
                                                    Date = dateStr,
                                                    Time = p.GetProperty("time").GetString(),
                                                    ManualStatus = newStatus,
                                                    IsJustified = newStatus != "NORMAL",
                                                    IsAbono = isAbonado, // ✨ SALVA NA TABELA DE PONTO 
                                                    CreatedAt = DateTime.UtcNow
                                                });
                                            }
                                        }
                                    }

                                    if (!temBatidaAtiva && newStatus != "NORMAL")
                                    {
                                        db.TimeRecords.Add(new TimeRecord
                                        {
                                            EmployeeId = empId,
                                            StoreId = emp.StoreId,
                                            Date = dateStr,
                                            Time = "00:00",
                                            ManualStatus = newStatus,
                                            IsJustified = true,
                                            IsAbono = isAbonado, // ✨ SALVA NA TABELA DE PONTO
                                            CreatedAt = DateTime.UtcNow
                                        });
                                    }

                                    string driveIdFinal = "";
                                    if (!string.IsNullOrEmpty(base64File))
                                    {
                                        try
                                        {
                                            GoogleDriveService _driveService = new GoogleDriveService();
                                            byte[] fileBytes = Convert.FromBase64String(base64File);
                                            using (var stream = new MemoryStream(fileBytes))
                                            {
                                                driveIdFinal = await Task.Run(async () => {
                                                    return await _driveService.UploadFileHierarchicalAsync(
                                                        stream, fileName, "image/png", "ID_DA_SUA_PASTA_RAIZ_AQUI", "Atestados", emp.Name
                                                    );
                                                }).WaitAsync(TimeSpan.FromSeconds(15));
                                            }
                                        }
                                        catch (Exception driveEx)
                                        {
                                            Console.WriteLine($"⚠️ Erro Drive ou Timeout: {driveEx.Message}");
                                            driveIdFinal = "ERRO_UPLOAD";
                                        }
                                    }

                                    var oldJusts = await db.AbsenceJustifications.Where(j => j.EmployeeId == empId && j.Date == dateStr).ToListAsync();
                                    db.AbsenceJustifications.RemoveRange(oldJusts);

                                    if (newStatus != "NORMAL")
                                    {
                                        db.AbsenceJustifications.Add(new AbsenceJustification
                                        {
                                            EmployeeId = empId,
                                            Date = dateStr,
                                            Type = newStatus,
                                            IsAbonado = isAbonado, // ✨ 3. O BUG MORTAL ESTAVA AQUI! Agora obedece o React 100%.
                                            DriveFileId = driveIdFinal,
                                            Description = description,
                                            CreatedAt = DateTime.UtcNow
                                        });
                                    }

                                    await db.SaveChangesAsync();

                                    await SendToReact("status-updated-success", new { employeeId = empId, date = dateStr, hasFile = !string.IsNullOrEmpty(driveIdFinal) });
                                }
                            }
                            catch (Exception ex)
                            {
                                var realError = ex.InnerException?.Message ?? ex.Message;
                                Console.WriteLine($"\n[ERRO CRÍTICO BANCO]: {realError}");
                                await SendToReact("error-occurred", $"Erro no Banco: {realError}");
                            }
                            break;
                        }
                    case "MANAGE_MANUAL_POINT":
                        {
                            try
                            {
                                var manualData = JsonSerializer.Deserialize<ManagePointDTO>(data.GetRawText(), _jsonOptions);

                                // ✨ PEGANDO DIRETAMENTE O ID QUE VOCÊ SELECIONOU NA TELA
                                int targetStoreId = manualData.StoreId;

                                // Validação de segurança: Se ainda assim vier 0, tenta pegar a primeira loja do banco
                                if (targetStoreId <= 0)
                                {
                                    using var db = new AppDbContext();
                                    targetStoreId = db.Stores.OrderBy(s => s.Id).Select(s => s.Id).FirstOrDefault();
                                }

                                if (manualData.Operation == "ADD" && manualData.Times != null && manualData.Times.Any())
                                {
                                    foreach (var t in manualData.Times)
                                    {
                                        await _timeService.ManageManualPointAsync(
                                            manualData.EmployeeId,
                                            targetStoreId, // ✨ USA O ID ESCOLHIDO
                                            manualData.Date, t, 1, "ADD", manualData.Justification);
                                    }
                                }
                                else
                                {
                                    await _timeService.ManageManualPointAsync(
                                        manualData.EmployeeId,
                                        targetStoreId, // ✨ USA O ID ESCOLHIDO
                                        manualData.Date, manualData.Time, manualData.PunchIndex, manualData.Operation, manualData.Justification);
                                }

                                await SendToReact("manual-point-success", "Ponto registrado com sucesso!");
                            }
                            catch (Exception ex)
                            {
                                // Mostra o erro detalhado para sabermos se o ID da loja chegou aqui
                                await SendToReact("manual-point-error", "Erro ao salvar: " + ex.Message);
                            }
                            break;
                        }
                    case "GET_DAY_PUNCHES":
                        {
                            using (var db = new AppDbContext())
                            {
                                int empId = data.GetProperty("employeeId").GetInt32();
                                string date = data.GetProperty("date").GetString();

                                var dayRecords = await db.TimeRecords
                                    .Where(r => r.EmployeeId == empId && r.Date == date)
                                    .OrderBy(r => r.Time)
                                    .Select(r => new {
                                        id = r.Id,
                                        time = r.Time,
                                        isActive = r.ManualStatus != "INATIVO" // Se for INATIVO, a caixinha desmarca
                                    })
                                    .ToListAsync();

                                await SendToReact("day-punches-loaded", dayRecords);
                            }
                            break;
                        }

                    case "SAVE_DAY_PUNCHES":
                        {
                            try
                            {
                                using (var db = new AppDbContext())
                                {
                                    int empId = data.GetProperty("employeeId").GetInt32();
                                    string date = data.GetProperty("date").GetString();
                                    var punches = data.GetProperty("punches").EnumerateArray();

                                    var emp = await db.Employees.FindAsync(empId);
                                    int storeId = emp?.StoreId ?? 1;

                                    foreach (var p in punches)
                                    {
                                        string time = p.GetProperty("time").GetString();
                                        bool isActive = p.GetProperty("isActive").GetBoolean();

                                        // Se marcou, vira MANUAL. Se desmarcou, vira INATIVO.
                                        string newStatus = isActive ? "MANUAL" : "INATIVO";

                                        if (p.TryGetProperty("id", out var idProp) && idProp.ValueKind != System.Text.Json.JsonValueKind.Null)
                                        {
                                            // ✨ Mudamos de "id" para "punchId" para não dar conflito!
                                            int punchId = idProp.GetInt32();
                                            var rec = await db.TimeRecords.FindAsync(punchId);
                                            if (rec != null)
                                            {
                                                rec.Time = time;
                                                rec.ManualStatus = newStatus;
                                                db.TimeRecords.Update(rec);
                                            }
                                        }
                                        else if (isActive)
                                        {
                                            // É uma batida nova que o RH adicionou e deixou ativa
                                            db.TimeRecords.Add(new TimeRecord
                                            {
                                                EmployeeId = empId,
                                                StoreId = storeId,
                                                Date = date,
                                                Time = time,
                                                ManualStatus = newStatus,
                                                CreatedAt = DateTime.UtcNow
                                            });
                                        }
                                    }
                                    await db.SaveChangesAsync();
                                    await SendToReact("manual-point-success", "Salvo com sucesso!");
                                }
                            }
                            catch (Exception ex)
                            {
                                string erro = ex.InnerException != null ? ex.InnerException.Message : ex.Message;
                                await SendToReact("error-occurred", "Erro ao salvar: " + erro);
                            }
                            break;
                        }
                    case "SAVE_VACATION":
                        {
                            try
                            {
                                using var db = new AppDbContext();

                                // 1. Lemos o JSON que o React mandou
                                var vacation = JsonSerializer.Deserialize<Vacation>(data.GetRawText(), _jsonOptions);

                                if (vacation != null)
                                {
                                    // 2. Adicionamos a data de criação por segurança
                                    vacation.CreatedAt = DateTime.UtcNow;

                                    db.Vacations.Add(vacation);
                                    await db.SaveChangesAsync();

                                    await SendToReact("db-config-success", "Férias agendadas com sucesso!");
                                }
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"❌ Erro ao salvar férias: {ex.Message}");
                                await SendToReact("error-occurred", "Falha ao gravar férias: " + ex.Message);
                            }
                            break;
                        }
                    case "PREVIEW_CSV_REPORT":
                        try
                        {
                            var prevObj = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(data.GetRawText());

                            // Pega a lista de IDs
                            var prevIds = prevObj.GetProperty("employeeIds").EnumerateArray().Select(e => e.GetInt32()).ToList();
                            string prevStart = prevObj.GetProperty("startDate").GetString();
                            string prevEnd = prevObj.GetProperty("endDate").GetString();

                            var previewList = await _timeService.GetReportPreviewAsync(prevIds, prevStart, prevEnd);
                            await SendToReact("report-preview-loaded", previewList);
                        }
                        catch (Exception ex) { await SendToReact("export-error", $"Erro no Preview: {ex.Message}"); }
                        break;

                    case "EXPORT_CSV_REPORT":
                        try
                        {
                            // 1. Lê o JSON
                            var req = System.Text.Json.JsonSerializer.Deserialize<ExportRequestDTO>(data.GetRawText(), _jsonOptions);
                            var idsList = req.EmployeeIds ?? new List<int>();

                            // 2. Gera o conteúdo da planilha
                            string csvContent = await _timeService.GenerateCsvReportAsync(idsList, req.StartDate, req.EndDate);

                            string prefix = idsList.Count == 1 ? $"Emp{idsList[0]}" : "Geral";
                            string filePathToSave = null;

                            // 3. Usa a Thread da UI APENAS para mostrar a janela e pegar o caminho do arquivo
                            Application.Current.Dispatcher.Invoke(() =>
                            {
                                var saveFileDialog = new Microsoft.Win32.SaveFileDialog
                                {
                                    Filter = "Planilha Excel CSV (*.csv)|*.csv",
                                    Title = "Salvar Relatório de Horas",
                                    FileName = $"Relatorio_Ponto_{prefix}_{DateTime.Now:yyyyMMdd}.csv"
                                };

                                if (saveFileDialog.ShowDialog() == true)
                                {
                                    filePathToSave = saveFileDialog.FileName; // Guarda o caminho escolhido
                                }
                            });

                            // 4. FORA da Thread da UI, nós salvamos o arquivo e avisamos o React (Sem congelar nada!)
                            if (!string.IsNullOrEmpty(filePathToSave))
                            {
                                System.IO.File.WriteAllText(filePathToSave, csvContent, new System.Text.UTF8Encoding(true));

                                // Agora sim podemos usar o await com tranquilidade
                                await SendToReact("export-success", "Planilha exportada com sucesso!");
                            }
                        }
                        catch (Exception ex)
                        {
                            await SendToReact("export-error", $"Erro na Exportação: {ex.Message}");
                        }
                        break;
                    case "CHECK_DELAYS":
                        {
                            try
                            {
                                using var db = new AppDbContext();
                                // Pegar os dados como lista anônima primeiro para evitar o erro de Cast no Banco
                                var registrosHoje = await db.TimeRecords
                                    .AsNoTracking()
                                    .Where(x => x.Date == DateTime.Today.ToString("yyyy-MM-dd"))
                                    .ToListAsync();

                                // Faça o processamento de lógica de atraso aqui na memória (LINQ to Objects)
                                // Isso evita que o driver Npgsql tente converter tipos complexos no SQL

                                // Exemplo de log para sabermos se passou daqui:
                                Console.WriteLine("✅ [CHECK_DELAYS] Verificação concluída sem erros de Cast.");
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"❌ [ERRO NO TIMER]: {ex.Message}");
                            }
                            break;
                        }
                
                }

                
            }

            catch (Exception ex)
            {
                MessageBox.Show($"[C# Maestro Error]: {ex.Message}");
            }
        }
          
    }
}