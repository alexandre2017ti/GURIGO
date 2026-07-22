using Microsoft.EntityFrameworkCore;
using RHSystem.Models;
using RHSystem.Desktop.Data;
using System.Globalization;

namespace RHSystem.Services
{
    public class ScheduleService
    {

        private readonly DbContextOptions<AppDbContext> _testOptions;

        // Construtor flexível: aceita opções de teste ou fica nulo (para usar Postgres)
        public ScheduleService(DbContextOptions<AppDbContext> testOptions = null)
        {
            _testOptions = testOptions;
        }

        // A Fábrica que decide qual banco criar
        private AppDbContext CreateDbContext()
        {
            return _testOptions != null ? new AppDbContext(_testOptions) : new AppDbContext();
        }
        // --- 1. PERSISTÊNCIA (Salvar e Buscar) ---

        public async Task SaveScheduleAsync(Schedule payload)
        {
            using var db = new AppDbContext();

            // Busca se já existe escala para este funcionário
            var existing = await db.Schedules
                                   .FirstOrDefaultAsync(s => s.EmployeeId == payload.EmployeeId);

            if (existing != null)
            {
                // Atualiza os valores existentes com os novos
                db.Entry(existing).CurrentValues.SetValues(payload);

                // Garante que o Entity Framework marque como modificado
                db.Entry(existing).State = EntityState.Modified;
            }
            else
            {
                // Cria nova escala
                await db.Schedules.AddAsync(payload);
            }

            await db.SaveChangesAsync();
        }

        public async Task<List<ScheduleTemplate>> GetTemplatesAsync()
        {
            using var db = new AppDbContext();
            return await db.ScheduleTemplates.AsNoTracking().ToListAsync();
        }

        // --- 2. REGRAS DE NEGÓCIO (Cálculos e Formatação) ---

        /// <summary>
        /// Calcula quantos segundos o funcionário deve trabalhar em uma data específica,
        /// considerando os dias da semana e os dois turnos.
        /// </summary>
        // No ScheduleService.cs

        public double GetExpectedSeconds(Schedule? schedule, DateTime date)
        {
            if (schedule == null) return 0;

            string dateStr = date.ToString("yyyy-MM-dd");

            // 1. ESCALA ROTATIVA
            if (schedule.ScheduleType == "VARIABLE" && !string.IsNullOrEmpty(schedule.RosterDaysJson))
            {
                if (schedule.RosterDaysJson.Split(',').Contains(dateStr)) return 0;
            }

            // ✨ FUNÇÃO AUXILIAR PARA CALCULAR DURAÇÃO (Trata virada de noite)
            double CalcularDiferenca(string? start, string? end)
            {
                if (string.IsNullOrWhiteSpace(start) || string.IsNullOrWhiteSpace(end)) return 0;

                // Normaliza strings como "  " ou "00:00"
                string s = start.Trim();
                string e = end.Trim();
                if (s == "00:00" && e == "00:00") return 0;

                if (TimeSpan.TryParse(s, out var tsStart) && TimeSpan.TryParse(e, out var tsEnd))
                {
                    // ✨ CALCULANDO EM MINUTOS TOTAIS (0 a 1440)
                    double startMins = tsStart.TotalMinutes;
                    double endMins = tsEnd.TotalMinutes;

                    double diff;
                    if (endMins < startMins)
                    {
                        // Caso Meia-noite (Ex: 22h às 06h)
                        // (1440 - 1320) + 360 = 120 + 360 = 480 minutos (8 horas)
                        diff = (1440 - startMins) + endMins;
                    }
                    else
                    {
                        diff = endMins - startMins;
                    }

                    return diff * 60; // Retorna em segundos
                }
                return 0;
            }

            // 2. DOMINGOS
            if (date.DayOfWeek == DayOfWeek.Sunday)
            {
                if (schedule.HasCustomSunday)
                {
                    return CalcularDiferenca(schedule.SundayStart, schedule.SundayEnd) +
                           CalcularDiferenca(schedule.SundayStart2, schedule.SundayEnd2);
                }
                if (!schedule.WorksSunday) return 0;
            }

            // 3. SÁBADOS
            if (date.DayOfWeek == DayOfWeek.Saturday && schedule.HasCustomSaturday)
            {
                return CalcularDiferenca(schedule.SaturdayStart, schedule.SaturdayEnd) +
                       CalcularDiferenca(schedule.SaturdayStart2, schedule.SaturdayEnd2);
            }

            // 4. DIAS COMUNS
            string dayName = date.DayOfWeek switch
            {
                DayOfWeek.Monday => "seg",
                DayOfWeek.Tuesday => "ter",
                DayOfWeek.Wednesday => "qua",
                DayOfWeek.Thursday => "qui",
                DayOfWeek.Friday => "sex",
                DayOfWeek.Saturday => "sab",
                DayOfWeek.Sunday => "dom",
                _ => ""
            };

            string workDays = schedule.WorkDays?.ToLower() ?? "";
            if (!workDays.Contains(dayName) && date.DayOfWeek != DayOfWeek.Sunday) return 0;

            return CalcularDiferenca(schedule.ShiftStart, schedule.ShiftEnd) +
                   CalcularDiferenca(schedule.ShiftStart2, schedule.ShiftEnd2);
        }

        public string GetFormattedScheduleText(Schedule s)
        {
            if (s == null) return "Sem escala configurada";

            // Horário padrão de segunda a sexta
            string textoSegSex = $"{s.ShiftStart}-{s.ShiftEnd}";
            if (!string.IsNullOrEmpty(s.ShiftStart2))
                textoSegSex += $" / {s.ShiftStart2}-{s.ShiftEnd2}";

            if (s.HasCustomSaturday)
            {
                // Monta o horário específico do sábado
                string textoSab = $"{s.SaturdayStart}-{s.SaturdayEnd}";
                if (!string.IsNullOrEmpty(s.SaturdayStart2))
                    textoSab += $" / {s.SaturdayStart2}-{s.SaturdayEnd2}";

                // Retorna os dois explicitamente
                return $"Seg-Sex: {textoSegSex} | Sáb: {textoSab}";
            }

            // Se o sábado não for customizado, mantém o formato original
            return $"{textoSegSex} ({s.WorkDays})";
        }
    }
}