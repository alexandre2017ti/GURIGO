using Microsoft.EntityFrameworkCore;
using RHSystem.Desktop.Data;
using RHSystem.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using static RHSystem.Desktop.MainWindow;

namespace RHSystem.Services
{
    // ✨ 1. Classe auxiliar para o ficheiro JSON (Modo Offline)
    public class PontoOffline
    {
        public int EmployeeId { get; set; }
        public string Pin { get; set; } // Guardamos o PIN, pois não sabemos o ID sem internet!
        public int StoreId { get; set; }
        public string Date { get; set; }
        public string Time { get; set; }

    }

    public class TimeService
    {

        // 1. A variável que guarda as opções
        private readonly DbContextOptions<AppDbContext> _testOptions;

        // 2. O construtor
        public TimeService(DbContextOptions<AppDbContext> testOptions = null)
        {
            _testOptions = testOptions;
        }

        // 3. ✨ A FUNÇÃO QUE ESTÁ FALTANDO (A Fábrica) ✨
        private AppDbContext CreateDbContext()
        {
            return _testOptions != null ? new AppDbContext(_testOptions) : new AppDbContext();
        }

        // ✨ 2. Caminho onde o ficheiro será guardado na máquina local
        private readonly string _offlineFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "pontos_pendentes.json");

        // 1. Registro de Ponto (Kiosk)
        public async Task RegisterPointAsync(int employeeId, int storeId)
        {
            using var db = CreateDbContext();

            // ✨ 1. O C# pergunta a hora exata baseada na configuração da tela
            DateTime agora = RHSystem.Helpers.TimeHelper.GetLocalTime();

            db.TimeRecords.Add(new TimeRecord
            {
                EmployeeId = employeeId,
                StoreId = storeId,

                // ✨ 2. Passamos os dados preenchidos! Isso faz o PostgreSQL ignorar a Trigger do -4h.
                Date = agora.ToString("yyyy-MM-dd"),
                Time = agora.ToString("HH:mm:ss"),

                ManualStatus = "NORMAL",
                CreatedAt = DateTime.UtcNow
            });

            await db.SaveChangesAsync();
        }


        // ==========================================
        // ✨ NOVO: MODO OFFLINE (RESILIÊNCIA)
        // ==========================================

        public void GravarPontoOffline(int employeeId, int storeId)
        {
            DateTime horaLocal = RHSystem.Helpers.TimeHelper.GetLocalTime();
            var lista = new List<PontoOffline>();

            if (File.Exists(_offlineFilePath))
            {
                string jsonExistente = File.ReadAllText(_offlineFilePath);
                lista = JsonSerializer.Deserialize<List<PontoOffline>>(jsonExistente) ?? new List<PontoOffline>();
            }

            lista.Add(new PontoOffline
            {
                EmployeeId = employeeId,
                StoreId = storeId,
                Date = horaLocal.ToString("yyyy-MM-dd"),
                Time = horaLocal.ToString("HH:mm:ss")
            });

            File.WriteAllText(_offlineFilePath, JsonSerializer.Serialize(lista));
            Debug.WriteLine($"[Offline] Ponto retido para o ID {employeeId}.");
        }

        public async Task SincronizarPontosOfflineAsync()
        {
            if (!File.Exists(_offlineFilePath)) return;

            try
            {
                string json = File.ReadAllText(_offlineFilePath);
                var lista = JsonSerializer.Deserialize<List<PontoOffline>>(json);

                if (lista == null || !lista.Any()) { File.Delete(_offlineFilePath); return; }

                using var db = new AppDbContext();

                // Testa a conexão naturalmente, sem forçar interrupção
                if (!await db.Database.CanConnectAsync()) return;

                foreach (var ponto in lista)
                {
                    db.TimeRecords.Add(new TimeRecord
                    {
                        EmployeeId = ponto.EmployeeId,
                        StoreId = ponto.StoreId,
                        Date = ponto.Date,
                        Time = ponto.Time,
                        ManualStatus = "NORMAL",
                        CreatedAt = DateTime.UtcNow
                    });
                }
                await db.SaveChangesAsync();
                File.Delete(_offlineFilePath);
                Debug.WriteLine("✅ Sincronização offline concluída com sucesso!");
            }
            catch (Exception ex)
            {
                // ✨ AGORA SIM! Se o arquivo corromper ou o banco rejeitar, a prova fica gravada!
                LoggerService.Log($"❌ Falha crítica ao sincronizar pontos offline: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"[Offline Sync Error] {ex.Message}");
            }
        }
        // ==========================================

        // 2. Verificação de Atrasos
        public async Task<List<object>> GetLateEmployeesAsync()
        {
            using var db = CreateDbContext();

            // ✨ 2. Usa o seu novo motor de Fuso Horário Dinâmico!
            var dataHoraLocal = RHSystem.Helpers.TimeHelper.GetLocalTime();
            var today = dataHoraLocal.ToString("yyyy-MM-dd");
            var now = dataHoraLocal.TimeOfDay;

            // 1. Pega todos os funcionários que possuem escala configurada
            var employees = await db.Employees
                .Where(e => e.IsActive && !string.IsNullOrEmpty(e.ShiftStart))
                .ToListAsync();

            // 2. Pega as batidas de hoje
            var punchesToday = await db.TimeRecords
                .Where(r => r.Date == today)
                .ToListAsync();

            var lateList = new List<object>();

            foreach (var emp in employees)
            {
                // Converte ShiftStart (ex: "08:00") para TimeSpan
                if (TimeSpan.TryParse(emp.ShiftStart, out TimeSpan shiftStart))
                {
                    // Verifica se ele já bateu o ponto hoje (qualquer batida)
                    bool hasPunched = punchesToday.Any(p => p.EmployeeId == emp.Id);

                    // Regra: Se agora já passou do horário de entrada + 10 min de tolerância
                    // E ele ainda não bateu o ponto...
                    if (!hasPunched && now > shiftStart.Add(TimeSpan.FromMinutes(10)))
                    {
                        lateList.Add(new
                        {
                            Id = emp.Id,
                            Name = emp.Name,
                            Expected = emp.ShiftStart,
                            Delay = (now - shiftStart).ToString(@"hh\:mm")
                        });
                    }
                }
            }
            return lateList;
        }

        public async Task<List<TimeRecordListItemDTO>> GetAllRecordsAsync()
        {
            using var db = new AppDbContext();

            return await db.TimeRecords
                .Include(r => r.Employee)
                .Include(r => r.Store)
                .OrderByDescending(r => r.Date)
                .ThenByDescending(r => r.Time)
                .Select(r => new TimeRecordListItemDTO
                {
                    Id = r.Id,
                    EmployeeId = r.EmployeeId,
                    EmployeeName = r.Employee.Name ?? "Desconhecido",
                    StoreName = r.Store.Name ?? "Unidade",
                    Date = r.Date,
                    Time = r.Time,
                    HasJustification = db.AbsenceJustifications.Any(j => j.EmployeeId == r.EmployeeId && j.Date == r.Date)
                })
                .ToListAsync();
        }
        public async Task<object> GetReportDataAsync(int employeeId, string startDateStr, string endDateStr)
        {
            using var db = CreateDbContext();
            var emp = await db.Employees
                .Include(e => e.SchedulesHistory)
                .Include(e => e.Store)
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == employeeId);

            if (emp == null) return null;

            DateTime startDate = DateTime.Parse(startDateStr);
            DateTime endDate = DateTime.Parse(endDateStr);

            // 1. O PDF pede os dados para o motor central!
            var dailyResults = await CalculateEmployeePeriodAsync(employeeId, startDate, endDate);

            bool isLactante = emp.SchedulesHistory.OrderByDescending(s => s.EffectiveDate ?? DateTime.MinValue).FirstOrDefault()?.IsBreastfeeding ?? false;

            string FormatMins(int mins) => $"{(mins / 60):D2}:{(mins % 60):D2}";
            string FormatBalance(int mins) => (mins >= 0 ? "+" : "-") + FormatMins(Math.Abs(mins));

            // 2. TRADUZ OS RESULTADOS DO MOTOR PARA AS COLUNAS DO REACT
            var lines = dailyResults.Select(r => new
            {
                dateFormatted = r.DateFormatted,
                weekDayShort = r.WeekDayShort,
                punches = r.Punches,
                observation = r.Observation,
                expectedDaily = r.ExpectedDisplay,
                totalHours = FormatMins(r.WorkedMins),
                extraHours = (r.Extra50Mins + r.Extra100Mins) > 0 ? FormatMins(r.Extra50Mins + r.Extra100Mins) : "",
                absenceHours = r.AbsenceMins > 0 ? FormatMins(r.AbsenceMins) : "",
                lateHours = r.LateMins > 0 ? FormatMins(r.LateMins) : "",
                holidayHours = r.HolidayMins > 0 ? FormatMins(r.HolidayMins) : "",
                abonoHours = r.AbonoMins > 0 ? FormatMins(r.AbonoMins) : "",
                dailyBalance = FormatBalance(r.BalanceMins),
                isPositive = r.IsPositive
            }).ToList();

            // 3. CALCULA OS TOTAIS GERAIS
            int sumExpected = dailyResults.Sum(r => r.ExpectedMins);
            int sumWorked = dailyResults.Sum(r => r.WorkedMins);
            int sumExtra50 = dailyResults.Sum(r => r.Extra50Mins);
            int sumExtra100 = dailyResults.Sum(r => r.Extra100Mins);
            int sumHoliday = dailyResults.Sum(r => r.HolidayMins);
            int sumAbsence = dailyResults.Sum(r => r.AbsenceMins);
            int sumLate = dailyResults.Sum(r => r.LateMins);
            int sumAbono = dailyResults.Sum(r => r.AbonoMins);
            int saldoFinalMins = dailyResults.Sum(r => r.BalanceMins);

            var razaoSocial = emp.Store?.Name ?? "EMPRESA PADRÃO";
            var cnpj = "00.000.000/0001-00";

            // ✨ A CORREÇÃO DA ESCALA (Busca do Histórico para não dar erro)
            var latestSchedule = emp.SchedulesHistory.OrderByDescending(s => s.EffectiveDate ?? DateTime.MinValue).FirstOrDefault();
            string headerText = "Variável";

            if (latestSchedule != null && !string.IsNullOrEmpty(latestSchedule.ShiftStart) && !string.IsNullOrEmpty(latestSchedule.ShiftEnd))
            {
                headerText = $"{latestSchedule.ShiftStart} às {latestSchedule.ShiftEnd}";
                if (!string.IsNullOrEmpty(latestSchedule.ShiftStart2) && !string.IsNullOrEmpty(latestSchedule.ShiftEnd2))
                {
                    headerText += $" / {latestSchedule.ShiftStart2} às {latestSchedule.ShiftEnd2}";
                }
            }

            // 4. ENVIA TUDO PRONTO
            return new
            {
                razaoSocial = razaoSocial,
                cnpj = cnpj,
                isServiceProvider = false,
                storeName = emp.Store?.Name ?? "LOJA 1",
                month = startDate.ToString("MM/yyyy"),
                employeeName = emp.Name,
                cpf = emp.Cpf ?? "---",
                ctps = emp.Ctps ?? "---",
                serie = emp.Serie ?? "---",
                admissionDate = emp.AdmissionDate?.ToString("dd/MM/yyyy") ?? "---",
                resignationDate = emp.ResignationDate?.ToString("dd/MM/yyyy") ?? "---",
                role = emp.Role ?? "---",
                scheduleHeader = headerText,

                period = $"{startDateStr} até {endDateStr}",
                isBreastfeeding = isLactante,
                lines = lines,

                totalExpected = FormatMins(sumExpected),
                totalWorked = FormatMins(sumWorked),
                totalExtras50 = FormatMins(sumExtra50),
                totalExtras100 = FormatMins(sumExtra100),
                totalHoliday = FormatMins(sumHoliday),
                totalAbsences = FormatMins(sumAbsence),
                totalLates = FormatMins(sumLate),
                totalAbono = FormatMins(sumAbono),
                monthlyBalance = FormatBalance(saldoFinalMins)
            };
        }

        public async Task<List<object>> GetSavedJustificationsAsync()
        {
            try
            {
                using var db = new AppDbContext();
                var list = await db.AbsenceJustifications
                    .Include(j => j.Employee)
                    .OrderByDescending(j => j.Date)
                    .AsNoTracking()
                    .ToListAsync();

                return list.Select(j => new {
                    id = j.Id,
                    employeeName = j.Employee?.Name ?? "Não identificado",
                    date = j.Date,
                    type = j.Type,
                    description = j.Description,
                    hasImage = !string.IsNullOrEmpty(j.DriveFileId),
                    driveFileId = j.DriveFileId
                }).Cast<object>().ToList();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Erro ao listar: {ex.Message}");
                return new List<object>();
            }
        }

        public async Task<bool> ImportRawPointDataAsync(string rawText, int employeeId, int storeId)
        {
            using var db = new AppDbContext();
            var dayRegex = new Regex(@"(\d{2}/\d{2})(domingo|segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sabado)", RegexOptions.IgnoreCase);
            var timeRegex = new Regex(@"\d{2}:\d{2}");
            var matches = dayRegex.Matches(rawText).Cast<Match>().ToList();

            var existingRecords = await db.TimeRecords
                .Where(r => r.EmployeeId == employeeId)
                .ToListAsync();

            for (int i = 0; i < matches.Count; i++)
            {
                var currentMatch = matches[i];
                string datePart = currentMatch.Groups[1].Value + "/2026";
                string dateDb = DateTime.ParseExact(datePart, "dd/MM/yyyy", null).ToString("yyyy-MM-dd");

                int startIndex = currentMatch.Index;
                int nextIndex = (i + 1 < matches.Count) ? matches[i + 1].Index : rawText.Length;
                string dayBlock = rawText.Substring(startIndex, nextIndex - startIndex);

                var times = timeRegex.Matches(dayBlock).Cast<Match>().Select(m => m.Value).ToList();

                if (times.Count > 0)
                {
                    foreach (var time in times)
                    {
                        if (times.IndexOf(time) < 4)
                        {
                            bool exists = existingRecords.Any(r => r.Date == dateDb && r.Time == time);

                            if (!exists)
                            {
                                var record = new TimeRecord
                                {
                                    EmployeeId = employeeId,
                                    StoreId = storeId,
                                    Date = dateDb,
                                    Time = time,
                                    Type = "IMPORTADO",
                                    ManualStatus = "NORMAL",
                                    IsJustified = false,
                                    CreatedAt = DateTime.UtcNow,
                                };
                                db.TimeRecords.Add(record);
                            }
                        }
                    }
                }
            }

            try
            {
                await db.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateException ex)
            {
                var innerMsg = ex.InnerException?.Message ?? ex.Message;
                LoggerService.Log($"❌ Erro ao salvar Importação: {innerMsg}");
                throw new Exception($"Falha no Banco: {innerMsg}");
            }
        }

        public async Task ManageManualPointAsync(int employeeId, int storeId, string date, string time, int punchIndex, string operation, string observation)
        {
            using var db = new AppDbContext();

            if (operation == "ADD")
            {
                db.TimeRecords.Add(new TimeRecord
                {
                    EmployeeId = employeeId,
                    StoreId = storeId,
                    Date = date,
                    Time = time,
                    ManualStatus = "MANUAL",
                    Observation = observation,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else
            {
                var records = await db.TimeRecords
                    .Where(r => r.EmployeeId == employeeId && r.Date == date)
                    .OrderBy(r => r.Time)
                    .ToListAsync();

                int arrayIndex = punchIndex - 1;

                if (arrayIndex < 0 || arrayIndex >= records.Count)
                {
                    throw new Exception($"A {punchIndex}ª batida não existe neste dia para ser alterada ou excluída.");
                }

                var targetRecord = records[arrayIndex];

                if (operation == "EDIT")
                {
                    targetRecord.Time = time;
                    targetRecord.ManualStatus = "MANUAL";
                    targetRecord.Observation = observation;
                    db.TimeRecords.Update(targetRecord);
                }
                else if (operation == "DELETE")
                {
                    db.TimeRecords.Remove(targetRecord);
                }
            }

            await db.SaveChangesAsync();
        }

        // =========================================================================
        // ✨ O NOVO CÉREBRO DA EXPORTAÇÃO (ALINHADO COM O PDF DO ESPELHO DE PONTO)
        // =========================================================================
        private async Task<List<dynamic>> CalculateExportDataAsync(List<int> employeeIds, string startDateStr, string endDateStr)
        {
            DateTime startDate = DateTime.Parse(startDateStr);
            DateTime endDate = DateTime.Parse(endDateStr);

            using var db = CreateDbContext();
            var emps = await db.Employees
                .Where(e => employeeIds == null || employeeIds.Count == 0 || employeeIds.Contains(e.Id))
                .Select(e => new { e.Id, e.Name })
                .ToListAsync();

            var resultData = new List<dynamic>();

            foreach (var emp in emps)
            {
                // ✨ Usa o motor também!
                var dailyResults = await CalculateEmployeePeriodAsync(emp.Id, startDate, endDate);

                foreach (var r in dailyResults)
                {
                    resultData.Add(new
                    {
                        EmployeeName = emp.Name,
                        Date = r.Date.ToString("dd/MM/yyyy"),
                        TotalWork = DailyRecordResult.FormatMins(r.WorkedMins),
                        Absence = DailyRecordResult.FormatMins(r.AbsenceMins),
                        Late = DailyRecordResult.FormatMins(r.LateMins),
                        He20 = DailyRecordResult.FormatMins(r.NightShiftMins),
                        He50 = DailyRecordResult.FormatMins(r.Extra50Mins),
                        He100 = DailyRecordResult.FormatMins(r.Extra100Mins),
                        Holiday = DailyRecordResult.FormatMins(r.HolidayMins)
                    });
                }
            }

            return resultData;
        }

        public async Task<string> GenerateCsvReportAsync(List<int> employeeIds, string startDate, string endDate)
        {
            var calculatedData = await CalculateExportDataAsync(employeeIds, startDate, endDate);

            var sb = new System.Text.StringBuilder();

            // ✨ Cabeçalho do Excel
            sb.AppendLine("Colaborador;Data;Total Trabalhado;Faltas;Atrasos;HE Noturno (20%);HE 50%;HE 100%;Feriado Trabalhado");

            // ✨ FUNÇÃO LOCAL PARA FORMATAR HORAS QUE PASSAM DE 24H
            string FormatarTotal(TimeSpan ts)
            {
                int horas = (int)Math.Floor(ts.TotalHours);
                return $"{horas:00}:{ts.Minutes:00}";
            }

            // ✨ AGRUPANDO OS DADOS POR FUNCIONÁRIO
            var groupedData = calculatedData.GroupBy(r => (string)r.EmployeeName);

            foreach (var group in groupedData)
            {
                // ✨ ZERA A CALCULADORA PARA CADA FUNCIONÁRIO NOVO
                TimeSpan somaTrab = TimeSpan.Zero;
                TimeSpan somaFalta = TimeSpan.Zero;
                TimeSpan somaAtraso = TimeSpan.Zero;
                TimeSpan somaHeNoturno = TimeSpan.Zero;
                TimeSpan somaHe50 = TimeSpan.Zero;
                TimeSpan somaHe100 = TimeSpan.Zero;
                TimeSpan somaFeriado = TimeSpan.Zero;

                // 1. IMPRIME TODOS OS DIAS DO FUNCIONÁRIO ATUAL
                foreach (var row in group)
                {
                    string tWork = row.TotalWork != null ? row.TotalWork.ToString() : "00:00";
                    string tAbs = row.Absence != null ? row.Absence.ToString() : "00:00";
                    string tLate = row.Late != null ? row.Late.ToString() : "00:00";
                    string tHe20 = row.He20 != null ? row.He20.ToString() : "00:00";
                    string tHe50 = row.He50 != null ? row.He50.ToString() : "00:00";
                    string tHe100 = row.He100 != null ? row.He100.ToString() : "00:00";
                    string tHol = row.Holiday != null ? row.Holiday.ToString() : "00:00";

                    sb.AppendLine($"{group.Key};{row.Date};{tWork};{tAbs};{tLate};{tHe20};{tHe50};{tHe100};{tHol}");

                    // Faz a soma individual da linha
                    if (TimeSpan.TryParse(tWork, out TimeSpan tw)) somaTrab += tw;
                    if (TimeSpan.TryParse(tAbs, out TimeSpan ab)) somaFalta += ab;
                    if (TimeSpan.TryParse(tLate, out TimeSpan atr)) somaAtraso += atr;
                    if (TimeSpan.TryParse(tHe20, out TimeSpan hn)) somaHeNoturno += hn;
                    if (TimeSpan.TryParse(tHe50, out TimeSpan h50)) somaHe50 += h50;
                    if (TimeSpan.TryParse(tHe100, out TimeSpan h100)) somaHe100 += h100;
                    if (TimeSpan.TryParse(tHol, out TimeSpan hol)) somaFeriado += hol;
                }

                // ✨ 2. IMPRIME A LINHA DE TOTAIS EXCLUSIVA DESTE FUNCIONÁRIO
                string linhaTotais = $"TOTAIS - {group.Key};;{FormatarTotal(somaTrab)};{FormatarTotal(somaFalta)};{FormatarTotal(somaAtraso)};{FormatarTotal(somaHeNoturno)};{FormatarTotal(somaHe50)};{FormatarTotal(somaHe100)};{FormatarTotal(somaFeriado)}";
                sb.AppendLine(linhaTotais);

                // 3. PULA UMA LINHA EM BRANCO ANTES DO PRÓXIMO FUNCIONÁRIO PARA O EXCEL FICAR BONITO
                sb.AppendLine(";;;;;;;;");
            }

            return sb.ToString();
        }

        // ==========================================
        // 2. GERADOR DA PRÉ-VISUALIZAÇÃO
        // ==========================================
        public async Task<object> GetReportPreviewAsync(List<int> employeeIds, string startDate, string endDate)
        {
            var calculatedData = await CalculateExportDataAsync(employeeIds, startDate, endDate);
            return calculatedData.Cast<object>().ToList();
        }

        public async Task<List<DailyRecordResult>> CalculateEmployeePeriodAsync(int employeeId, DateTime startDate, DateTime endDate)
        {
            using var db = CreateDbContext(); // AGORA SIM ELE FICA NA MEMÓRIA RAM!
            var emp = await db.Employees
                .Include(e => e.SchedulesHistory)
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == employeeId);

            if (emp == null) return new List<DailyRecordResult>();

            string startStr = startDate.ToString("yyyy-MM-dd");
            string endStr = endDate.ToString("yyyy-MM-dd");

            var records = await db.TimeRecords
                .Where(t => t.EmployeeId == employeeId
                         && string.Compare(t.Date, startStr) >= 0
                         && string.Compare(t.Date, endStr) <= 0
                         && t.ManualStatus != "INATIVO") 
                .OrderBy(t => t.Date).ThenBy(t => t.Time)
                .AsNoTracking()
                .ToListAsync();

            var justifications = await db.AbsenceJustifications
                .Where(j => j.EmployeeId == employeeId && string.Compare(j.Date, startStr) >= 0 && string.Compare(j.Date, endStr) <= 0)
                .Select(j => new
                {
                    j.Date,
                    j.Type,
                    j.IsAbonado
                })
                .ToListAsync();

            var scheduleService = new ScheduleService(_testOptions);
            var resultList = new List<DailyRecordResult>();
            bool isLactante = emp.SchedulesHistory.OrderByDescending(s => s.EffectiveDate ?? DateTime.MinValue).FirstOrDefault()?.IsBreastfeeding ?? false;
            var ptBR = new System.Globalization.CultureInfo("pt-BR");
            DateTime today = DateTime.UtcNow.Date;

            for (DateTime dt = startDate; dt <= endDate; dt = dt.AddDays(1))
            {
                // ✨ O CÉREBRO TEMPORAL: Qual escala estava valendo neste dia exato 'dt'?
                var currentDaySchedule = emp.SchedulesHistory
                    .Where(s => s.EffectiveDate.HasValue && s.EffectiveDate.Value.Date <= dt.Date)
                    .OrderByDescending(s => s.EffectiveDate.Value.Date)
                    .FirstOrDefault();

                // Se não achou nada no histórico, usa a escala antiga (Legado)
                if (currentDaySchedule == null) currentDaySchedule = emp.SchedulesHistory.OrderBy(s => s.EffectiveDate ?? DateTime.MinValue).FirstOrDefault();
                // Verifica se é lactante baseado na escala DESTE DIA específico


                string dateStr = dt.ToString("yyyy-MM-dd");
                var dayRecords = records.Where(r => r.Date == dateStr).ToList();

                string statusRH = dayRecords.FirstOrDefault(r => r.ManualStatus != "INATIVO" && !string.IsNullOrEmpty(r.ManualStatus))?.ManualStatus ?? "NORMAL";
                var just = justifications.FirstOrDefault(j => j.Date == dateStr);

                if (just != null && statusRH == "NORMAL") statusRH = just.Type;

                var dayPunches = dayRecords.Where(r => r.ManualStatus != "INATIVO").Select(r => r.Time).ToList();
                if (dayPunches.Count == 1 && dayPunches[0] == "00:00" && statusRH != "NORMAL") dayPunches.Clear();

                bool isFutureOrToday = dt.Date >= today;
                bool isTerminated = emp.ResignationDate.HasValue && dt.Date > emp.ResignationDate.Value.Date;

                // ============================================================================
                // 1. A TRAVA DO CALENDÁRIO REACT (Lê a Folga Rotativa da escala atual)
                // ============================================================================
                bool isRosterOffDay = currentDaySchedule != null &&
                                      currentDaySchedule.ScheduleType == "VARIABLE" &&
                                      !string.IsNullOrEmpty(currentDaySchedule.RosterDaysJson) &&
                                      currentDaySchedule.RosterDaysJson.Split(',').Contains(dateStr);

                if (isRosterOffDay && statusRH == "NORMAL")
                {
                    statusRH = "FOLGA";
                }

                // 2. CÁLCULO DA META DE HORAS (Previsto pela escala atual)
                int expectedMinsOriginal = 0;
                string prevDisplay = "";

                // Se for uma folga/afastamento inteiro, a meta é zero
                if (statusRH == "FOLGA" || statusRH == "FERIAS" || statusRH == "LICENCA_MATERNIDADE" || statusRH == "FOLGA_COMPENSATORIA" || statusRH == "INSS" || (statusRH != null && statusRH.StartsWith("FERIADO")))
                {
                    expectedMinsOriginal = 0;
                    prevDisplay = (statusRH == "FOLGA" || (statusRH != null && statusRH.StartsWith("FERIADO"))) ? statusRH.Replace("_", " ") : "00:00";
                }
                else if (currentDaySchedule != null)
                {
                    // Se ele tem escala no histórico, calcula a meta de minutos
                    expectedMinsOriginal = (int)(scheduleService.GetExpectedSeconds(currentDaySchedule, dt) / 60);

                    // TRAVA DE SEGURANÇA: Já escreve o Previsto bonito no PDF aqui para não borrar depois!
                    prevDisplay = expectedMinsOriginal > 0 ? DailyRecordResult.FormatMins(expectedMinsOriginal) : "FOLGA";
                }
                else
                {
                    // Se o funcionário não tem absolutamente NENHUMA escala cadastrada
                    expectedMinsOriginal = 0;
                    prevDisplay = "SEM ESCALA";
                }

                // Passamos o valor para a variável matemática
                int expectedMins = expectedMinsOriginal;

                // ============================================================================
                // 3. CÁLCULO DO TEMPO TRABALHADO REAL (O seu loop de pares)
                // ============================================================================
                int workedMins = 0;
                int nightMins = 0;
                var timesForCalc = dayPunches.Where(p => p != "00:00" || statusRH == "NORMAL").Select(p => TimeSpan.Parse(p)).ToList();

                for (int i = 0; i + 1 < timesForCalc.Count; i += 2)
                {
                    TimeSpan start = timesForCalc[i];
                    TimeSpan end = timesForCalc[i + 1];
                    if (end < start) end += TimeSpan.FromHours(24);

                    int chunkMins = (int)(end - start).TotalMinutes;
                    workedMins += chunkMins;

                    for (int m = 0; m < chunkMins; m++)
                    {
                        double timeOfDay = start.Add(TimeSpan.FromMinutes(m)).TotalHours % 24;
                        if (timeOfDay >= 22 || timeOfDay < 5) nightMins++;
                    }
                }

                string obs = "";
                

                // ✨ LÊ A FLAG ISABONADO DO BANCO
                bool isAbono = (just != null && just.IsAbonado) || dayRecords.Any(r => r.IsAbono); int dailyAbono = 0;
                bool isBeforeAdmission = emp.AdmissionDate.HasValue && dt.Date < emp.AdmissionDate.Value.Date;
                // ✨ 1. TRAVA GLOBAL (Admissão e Rescisão)
                // Se o cara não foi admitido ou já saiu, nada mais importa: meta e trabalho são ZERO.
                if (statusRH == "NAO_ADIMITIDO" || isBeforeAdmission)
                {
                    expectedMins = 0;
                    workedMins = 0;
                    obs = "NÃO ADMITIDO";
                    dayPunches.Clear();
                }
                else if (isTerminated)
                {
                    expectedMins = 0;
                    workedMins = 0;
                    obs = "DESLIGADO";
                    dayPunches.Clear();
                }
                // ✨ 2. STATUS DE AFASTAMENTO TOTAL
                else if (statusRH == "FOLGA" || statusRH == "FERIAS" || statusRH == "LICENCA_MATERNIDADE" || statusRH == "FOLGA_COMPENSATORIA" || statusRH == "INSS")
                {
                    expectedMins = 0;
                    obs = statusRH.Replace("_", " ");
                    if (statusRH == "LICENCA_MATERNIDADE" || statusRH == "INSS") isAbono = true;
                }
                // ✨ 2.1 TRATAMENTO INTELIGENTE DE FERIADO
                else if (statusRH != null && statusRH.StartsWith("FERIADO"))
                {
                    // Lê se o RH informou um horário de jornada no feriado (Ex: FERIADO 08:00 às 12:00)
                    var matchParcial = System.Text.RegularExpressions.Regex.Match(statusRH, @"(\d{2}:\d{2}).*?(\d{2}:\d{2})");

                    if (matchParcial.Success && TimeSpan.TryParse(matchParcial.Groups[1].Value, out var hInicio) && TimeSpan.TryParse(matchParcial.Groups[2].Value, out var hFim))
                    {
                        expectedMins = (int)(hFim < hInicio ? hFim.Add(TimeSpan.FromHours(24)) - hInicio : hFim - hInicio).TotalMinutes;
                    }
                    else
                    {
                        expectedMins = 0; // Se não informou horário, a meta do feriado é zero
                    }

                    if (workedMins > 0)
                    {
                        obs = statusRH == "FERIADO" ? "FERIADO TRABALHADO" : statusRH.Replace(" (DESCONTO)", "") + " (TRABALHADO)";
                        statusRH = "FERIADO_TRABALHADO_INTERNO";
                    }
                    else
                    {
                        obs = statusRH.Replace(" (DESCONTO)", "");
                    }
                }

                // ✨ 3. ABONOS E ATESTADOS (Lógica Parcial)
                else if (statusRH.StartsWith("ATESTADO") || statusRH.StartsWith("FALTA") || statusRH.StartsWith("ABONO") || statusRH.StartsWith("INSS"))
                {
                    var matchParcial = System.Text.RegularExpressions.Regex.Match(statusRH, @"(\d{2}:\d{2}).*?(\d{2}:\d{2})");

                    if (matchParcial.Success)
                    {
                        if (TimeSpan.TryParse(matchParcial.Groups[1].Value, out var hInicio) &&
                            TimeSpan.TryParse(matchParcial.Groups[2].Value, out var hFim))
                        {
                            if (isAbono)
                            {
                                // Abono Parcial (Atestados, INSS, Abono)
                                dailyAbono = (int)(hFim < hInicio ? hFim.Add(TimeSpan.FromHours(24)) - hInicio : hFim - hInicio).TotalMinutes;
                                obs = statusRH.Replace(" (DESCONTO)", "");
                            }
                            else
                            {
                                // Falta Parcial (A flag isAbono é falsa)
                                obs = $"FALTA PERÍODO ({matchParcial.Groups[1].Value} às {matchParcial.Groups[2].Value})";
                            }
                        }
                    }
                    else
                    {
                        // Dia Inteiro
                        obs = statusRH.Replace(" (DESCONTO)", "");
                    }
                }
                int diffMins = workedMins - expectedMins;
                int dailyExtra = 0, dailyLate = 0, dailyAbsence = 0, dailyHoliday = 0;
                int dailyExtra50 = 0, dailyExtra100 = 0;

                bool isSundayDSR = dt.DayOfWeek == DayOfWeek.Sunday && expectedMins == 0;
                bool isScheduledOffDay = expectedMins == 0 && dt.DayOfWeek != DayOfWeek.Sunday;

                // ✨ LÓGICA DE FERIADO
                if (statusRH == "FERIADO_TRABALHADO_INTERNO" || (statusRH != null && statusRH.StartsWith("FERIADO")))
                {
                    if (workedMins > 0)
                    {
                        dailyHoliday = workedMins; // 100% das horas vão pro Box de Feriado!
                        diffMins = 0;              // Feriado não gera Extra comum nem Atraso
                    }
                    else if (expectedMins > 0 && !isFutureOrToday)
                    {
                        dailyAbsence = expectedMins; // Tinha meta informada no feriado e não foi = Falta
                        diffMins = -expectedMins;
                    }
                    else
                    {
                        diffMins = 0;
                    }
                }
                // ✨ LÓGICA DE FOLGA/DSR TRABALHADO
                else if (statusRH == "FOLGA" || statusRH == "FOLGA_COMPENSATORIA" || isScheduledOffDay || isSundayDSR)
                {
                    if (workedMins > 0)
                    {
                        dailyExtra100 = workedMins;
                        diffMins = 0;
                    }
                }
                // ✨ LÓGICA DE DIAS NORMAIS (Atraso vs Falta vs Extra)
                else
                {
                    if (expectedMins > 0)
                    {
                        // 1. Não trabalhou nada no dia
                        if (!isFutureOrToday && workedMins == 0 && string.IsNullOrEmpty(obs))
                        {
                            dailyAbsence = expectedMins; // ZERO MINUTOS TRABALHADOS = Falta Total
                            obs = isLactante ? "FALTA / LACTANTE" : "FALTA";
                            diffMins = -expectedMins;
                        }
                        // 2. Trabalhou, mas ficou devendo horas
                        else if (diffMins < 0)
                        {
                            int minutosDevidos = Math.Abs(diffMins);

                            // 👇 AS SUAS DUAS PRIMEIRAS REGRAS CRAVADAS AQUI 👇
                            if (minutosDevidos >= 10)
                            {
                                dailyAbsence = minutosDevidos; // Ficou devendo 10 min ou mais = FALTA
                            }
                            else
                            {
                                dailyLate = minutosDevidos;    // Ficou devendo de 1 a 9 minutos = ATRASO
                            }
                        }
                        // 3. Trabalhou a mais (chegou cedo ou saiu tarde)
                        else if (diffMins > 0)
                        {
                            // 👇 SUAS DUAS ÚLTIMAS REGRAS AQUI 👇
                            dailyExtra = diffMins; // Tudo que passar do Previsto vira Extra
                        }
                    }
                    // Se não tinha meta (escala zerada), mas trabalhou, é tudo extra
                    else if (workedMins > 0)
                    {
                        dailyExtra = workedMins;
                    }

                    if (workedMins > 0 && string.IsNullOrEmpty(obs) && isLactante) obs = "LACTANTE";

                    // Separa Extras em 50% (Até 2h) e 100% (Acima de 2h)
                    if (dailyExtra > 0)
                    {
                        if (dailyExtra > 120) { dailyExtra50 = 120; dailyExtra100 = dailyExtra - 120; }
                        else dailyExtra50 = dailyExtra;
                    }
                }

                // ============================================================================
                // ✨ O PULO DO GATO: A MATEMÁTICA DO ABONO
                // ============================================================================
                if (isAbono || dailyAbono > 0)
                {
                    if (dailyAbono == 0 && isAbono)
                    {
                        dailyAbono = dailyAbsence + dailyLate;
                    }

                    int totalDevido = dailyAbsence + dailyLate;
                    if (dailyAbono > totalDevido) dailyAbono = totalDevido;

                    diffMins += dailyAbono;
                }

                if (isAbono && !string.IsNullOrEmpty(obs) && obs != "NORMAL" && obs != "---" && !obs.StartsWith("FALTA PERÍODO"))
                {
                    // ✨ TRAVA ADICIONADA: Se tiver "FERIADO" no nome, a palavra "ABONADO" não entra!
                    if (!obs.Contains("ABONADO") && !obs.Contains("ABONO") && !obs.Contains("MATERNIDADE") && !obs.Contains("INSS") && !obs.Contains("FERIADO"))
                    {
                        obs = obs + " (ABONADO)";
                    }
                }

                // ============================================================================
                // 6. Montagem do Resultado do Dia
                // ============================================================================
                if (dt.DayOfWeek == DayOfWeek.Sunday && workedMins == 0)
                {
                    prevDisplay = "---";
                    obs = "---";

                    // Zera as variáveis de cálculo para este dia específico
                    expectedMins = 0;   // Não espera nada
                    dailyAbsence = 0;   // Não gera falta
                    dailyLate = 0;      // Não gera atraso
                    diffMins = 0;       // Zera o balanço do dia
                    dailyExtra50 = 0;   // Garante que não haja extra
                    dailyExtra100 = 0;  // Garante que não haja extra
                }
                else if (expectedMins == 0)
                {
                    prevDisplay = (isScheduledOffDay || isSundayDSR) ? "FOLGA" : "00:00";
                }
                else
                {
                    int h = expectedMins / 60;
                    int m = expectedMins % 60;
                    prevDisplay = $"{h:00}:{m:00}"; 
                }

                resultList.Add(new DailyRecordResult
                {
                    Date = dt,
                    DateFormatted = dt.ToString("dd/MM"),
                    WeekDayShort = dt.ToString("ddd", ptBR).ToUpper().Replace(".", ""),
                    Punches = dayPunches,
                    Observation = obs,
                    ExpectedDisplay = prevDisplay,
                    ExpectedMins = expectedMins,
                    WorkedMins = workedMins,
                    Extra50Mins = dailyExtra50,
                    Extra100Mins = dailyExtra100,
                    AbsenceMins = dailyAbsence,
                    LateMins = dailyLate,
                    HolidayMins = dailyHoliday,
                    NightShiftMins = nightMins,
                    AbonoMins = dailyAbono, 
                    BalanceMins = isFutureOrToday && diffMins < 0 ? 0 : diffMins,
                    IsPositive = diffMins >= 0
                });
            }

            return resultList;
        }
    }
}