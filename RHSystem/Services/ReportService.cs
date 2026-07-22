using Microsoft.EntityFrameworkCore;
using RHSystem.Desktop.Data;
using RHSystem.Services;
using RHSystem.Models;
using static RHSystem.Desktop.MainWindow;

public class ReportService
{
    private readonly TimeService _timeService;
    private readonly AppDbContext _db;

    public ReportService(TimeService timeService = null, AppDbContext db = null)
    {
        _timeService = timeService ?? new TimeService();
        _db = db ?? new AppDbContext();
    }

    public async Task<object> GetMonthlyTimesheetData(int empId, int month, int year)
    {
        using var db = new AppDbContext();
        var emp = await db.Employees
            .Include(e => e.Store).ThenInclude(s => s.ServiceProvider)
            // ✨ 1. TRAZENDO A LISTA COMPLETA DE ESCALAS
            .Include(e => e.SchedulesHistory)
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == empId);

        if (emp == null) throw new Exception($"Funcionário ID {empId} não encontrado.");

        DateTime startDate = new DateTime(year, month, 1);
        DateTime endDate = new DateTime(year, month, DateTime.DaysInMonth(year, month));

        var dailyResults = await _timeService.CalculateEmployeePeriodAsync(empId, startDate, endDate);

        int totalExpected = dailyResults.Sum(r => r.ExpectedMins);
        int totalWorked = dailyResults.Sum(r => r.WorkedMins);
        int totalExtra50 = dailyResults.Sum(r => r.Extra50Mins);
        int totalExtra100 = dailyResults.Sum(r => r.Extra100Mins);
        int totalAbsencesLates = dailyResults.Sum(r => r.AbsenceMins);
        int totalLates = dailyResults.Sum(r => r.LateMins);
        int totalHoliday = dailyResults.Sum(r => r.HolidayMins);
        int monthlyBalance = dailyResults.Sum(r => r.BalanceMins);

        int totalAbono = dailyResults.Sum(r => r.AbonoMins);

        var reportLines = dailyResults.Select(r => new
        {
            dateFormatted = r.DateFormatted,
            weekDayShort = r.WeekDayShort,
            punches = r.Punches,
            observation = r.Observation,
            expectedDaily = r.ExpectedDisplay,
            totalHours = DailyRecordResult.FormatMins(r.WorkedMins),
            extraHours = r.Extra50Mins + r.Extra100Mins > 0 ? DailyRecordResult.FormatMins(r.Extra50Mins + r.Extra100Mins) : "",
            lateHours = r.LateMins > 0 ? DailyRecordResult.FormatMins(r.LateMins) : "",
            absenceHours = r.AbsenceMins > 0 ? DailyRecordResult.FormatMins(r.AbsenceMins) : "",
            abonoHours = r.AbonoMins > 0 ? DailyRecordResult.FormatMins(r.AbonoMins) : "",
            dailyBalance = DailyRecordResult.FormatMins(r.BalanceMins, true),
            isPositive = r.IsPositive
        }).ToList();

        var scheduleService = new ScheduleService();

        // ============================================================================
        // ✨ 2. GERADOR DE LINHA DO TEMPO DA ESCALA (Múltiplas Escalas no Mês)
        // ============================================================================
        var monthSchedules = new List<Schedule>();

        // A. Pega a escala que já estava valendo quando o mês começou (Dia 1)
        var initialSchedule = emp.SchedulesHistory
            .Where(s => s.EffectiveDate == null || s.EffectiveDate.Value.Date <= startDate.Date)
            .OrderByDescending(s => s.EffectiveDate ?? DateTime.MinValue)
            .FirstOrDefault();

        // Fallback de Segurança
        if (initialSchedule == null)
        {
            initialSchedule = emp.SchedulesHistory.OrderBy(s => s.EffectiveDate ?? DateTime.MinValue).FirstOrDefault();
        }

        if (initialSchedule != null) monthSchedules.Add(initialSchedule);

        // B. Pega as escalas que começaram "no meio" deste mês
        var midMonthSchedules = emp.SchedulesHistory
            .Where(s => s.EffectiveDate.HasValue && s.EffectiveDate.Value.Date > startDate.Date && s.EffectiveDate.Value.Date <= endDate.Date)
            .OrderBy(s => s.EffectiveDate.Value.Date)
            .ToList();

        foreach (var s in midMonthSchedules)
        {
            if (monthSchedules.All(ms => ms.Id != s.Id))
                monthSchedules.Add(s);
        }

        // C. Monta o texto de exibição (Ex: "[01/04 a 14/04] 08:00 às 12:00...")
        var scheduleTexts = new List<string>();

        if (monthSchedules.Count == 1)
        {
            // Se foi uma escala só, mostra normal
            scheduleTexts.Add(scheduleService.GetFormattedScheduleText(monthSchedules[0]));
        }
        else
        {
            // Se mudou de escala, separa por datas
            for (int i = 0; i < monthSchedules.Count; i++)
            {
                var currentSched = monthSchedules[i];

                DateTime rStart = startDate;
                if (currentSched.EffectiveDate.HasValue && currentSched.EffectiveDate.Value.Date > startDate.Date)
                {
                    rStart = currentSched.EffectiveDate.Value.Date;
                }

                DateTime rEnd = endDate;
                if (i + 1 < monthSchedules.Count && monthSchedules[i + 1].EffectiveDate.HasValue)
                {
                    rEnd = monthSchedules[i + 1].EffectiveDate.Value.Date.AddDays(-1);
                }

                string text = scheduleService.GetFormattedScheduleText(currentSched);
                scheduleTexts.Add($"[{rStart:dd/MM} a {rEnd:dd/MM}] {text}");
            }
        }

        string escalaTexto = string.Join("  |  ", scheduleTexts);
        // ============================================================================

        bool isStoreServiceMode = emp.Store?.UseServiceProvider == true;

        string razaoSocialFinal = isStoreServiceMode && emp.Store?.ServiceProvider != null
            ? emp.Store.ServiceProvider.RazaoSocial
            : (emp.Store?.RazaoSocialCustom ?? emp.Store?.Name ?? "EMPRESA");

        string cnpjFinal = isStoreServiceMode && emp.Store?.ServiceProvider != null
            ? emp.Store.ServiceProvider.Cnpj
            : (emp.Store?.CnpjCustom ?? "00.000.000/0000-00");

        return new
        {
            razaoSocial = razaoSocialFinal,
            cnpj = cnpjFinal,
            storeName = emp.Store?.Name ?? "Unidade não informada",
            isServiceProvider = isStoreServiceMode,
            employeeName = emp.Name,
            cpf = emp.Cpf ?? "---",
            ctps = !string.IsNullOrEmpty(emp.Ctps) ? emp.Ctps : "---",
            serie = !string.IsNullOrEmpty(emp.Serie) ? emp.Serie : "---",
            admissionDate = emp.AdmissionDate.HasValue && emp.AdmissionDate != DateTime.MinValue
                ? emp.AdmissionDate.Value.ToString("dd/MM/yyyy")
                : "---",
            resignationDate = emp.ResignationDate?.ToString("dd/MM/yyyy") ?? "---",
            role = emp.Role ?? "---",
            month = $"{month:D2}/{year}",
            scheduleHeader = escalaTexto, // ✨ TEXTO COM AS DATAS FICA AQUI!
            lines = reportLines,
            totalExpected = DailyRecordResult.FormatMins(totalExpected),
            totalWorked = DailyRecordResult.FormatMins(totalWorked),
            totalExtras = DailyRecordResult.FormatMins(totalExtra50 + totalExtra100),
            totalExtras50 = DailyRecordResult.FormatMins(totalExtra50),
            totalExtras100 = DailyRecordResult.FormatMins(totalExtra100),
            totalHoliday = DailyRecordResult.FormatMins(totalHoliday),
            totalAbsences = DailyRecordResult.FormatMins(totalAbsencesLates),
            totalLates = DailyRecordResult.FormatMins(totalLates),
            totalAbono = DailyRecordResult.FormatMins(totalAbono),
            monthlyBalance = DailyRecordResult.FormatMins(monthlyBalance, true)
        };
    }
}