using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace RHSystem.Models
{
    [Table("Schedules")]
    public class Schedule
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [JsonPropertyName("employeeId")]
        public int EmployeeId { get; set; }

        [JsonPropertyName("storeId")]
        public int StoreId { get; set; }
        public DateTime? EffectiveDate { get; set; }

        [MaxLength(14)]
        public string Cpf { get; set; } = string.Empty;
        public string? SaturdayStart { get; set; }
        public string? SaturdayEnd { get; set; }
        public string? SaturdayStart2 { get; set; }
        public string? SaturdayEnd2 { get; set; }
        public string ScheduleType { get; set; } = "FIXED";
        public string RosterDaysJson { get; set; }
        public bool IsBreastfeeding { get; set; } = false;
        public bool HasCustomSunday { get; set; } = false;
        public string? SundayStart { get; set; }
        public string? SundayEnd { get; set; }
        public string? SundayStart2 { get; set; }
        public string? SundayEnd2 { get; set; }
        [JsonPropertyName("hasCustomSaturday")]
        public bool HasCustomSaturday { get; set; } // Flag para saber se usa horário especial

        // --- CAMPOS DE HORÁRIO EXPLICITOS ---
        [MaxLength(5)]
        [JsonPropertyName("shiftStart")]
        public string? ShiftStart { get; set; } = "07:00";

        [MaxLength(5)]
        [JsonPropertyName("shiftEnd")]
        public string? ShiftEnd { get; set; } = "11:00";

        [MaxLength(5)]
        [JsonPropertyName("shiftStart2")]
        public string? ShiftStart2 { get; set; } = "13:00";

        [MaxLength(5)]
        [JsonPropertyName("shiftEnd2")]
        public string? ShiftEnd2 { get; set; } = "17:20";

        // --- CONFIGURAÇÕES ---
        [MaxLength(100)]
        [JsonPropertyName("workDays")]
        public string WorkDays { get; set; } = "Seg,Ter,Qua,Qui,Sex,Sab";

        [JsonPropertyName("worksSunday")]
        public bool WorksSunday { get; set; } = false;

        [MaxLength(20)]
        [JsonPropertyName("sundayCompensation")]
        public string? SundayCompensation { get; set; } = "Folga";

        [MaxLength(20)]
        [JsonPropertyName("offDay")]
        public string? OffDay { get; set; }

        [MaxLength(5)]
        [JsonPropertyName("dailyHours")]
        public string DailyHours { get; set; } = "08:00";

        // --- LÓGICA DE CÁLCULO ---
        public double GetExpectedDailySeconds(DateTime date)
        {
            // 1. ESCALA ROTATIVA (Lê o JSON do Calendário Laranja)
            // Adapte o "ROTATIVA" para o termo exato que você salva no banco (ex: "ROTATIVE" ou "ROTATIVA")
            if (ScheduleType == "ROTATIVA" && !string.IsNullOrEmpty(RosterDaysJson))
            {
                string dateStr = date.ToString("yyyy-MM-dd");
                if (RosterDaysJson.Contains(dateStr))
                {
                    return 0; // O dia foi clicado no calendário, logo é FOLGA.
                }
            }

            // 2. DOMINGOS
            if (date.DayOfWeek == DayOfWeek.Sunday)
            {
                if (!WorksSunday) return 0; // Não trabalha de domingo

                if (HasCustomSunday) // Trabalha com horário especial
                    return CalculateShiftDuration(SundayStart, SundayEnd) + CalculateShiftDuration(SundayStart2, SundayEnd2);

                // Se trabalha domingo mas NÃO tem horário customizado (O caso da Bruna!)
                return CalculateShiftDuration(ShiftStart, ShiftEnd) + CalculateShiftDuration(ShiftStart2, ShiftEnd2);
            }

            // 3. SÁBADOS
            if (date.DayOfWeek == DayOfWeek.Saturday)
            {
                if (!WorkDays.Contains("Sab")) return 0; // Sábado não está nos dias de trabalho

                if (HasCustomSaturday) // Trabalha com horário especial de sábado
                    return CalculateShiftDuration(SaturdayStart, SaturdayEnd) + CalculateShiftDuration(SaturdayStart2, SaturdayEnd2);

                return CalculateShiftDuration(ShiftStart, ShiftEnd) + CalculateShiftDuration(ShiftStart2, ShiftEnd2);
            }

            // 4. SEGUNDA A SEXTA
            string[] diasPT = { "Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab" };
            string diaAtual = diasPT[(int)date.DayOfWeek];

            if (!WorkDays.Contains(diaAtual)) return 0; // Dia da semana não marcado na string WorkDays

            // Horário normal
            return CalculateShiftDuration(ShiftStart, ShiftEnd) + CalculateShiftDuration(ShiftStart2, ShiftEnd2);
        }

        private double CalculateShiftDuration(string? start, string? end)
        {
            if (string.IsNullOrWhiteSpace(start) || string.IsNullOrWhiteSpace(end) || start == "00:00")
                return 0;

            if (TimeSpan.TryParse(start, out var s) && TimeSpan.TryParse(end, out var e))
                return (e - s).TotalSeconds;

            return 0;
        }

        // --- NAVEGAÇÃO ---
        [ForeignKey("EmployeeId")]
        public virtual Employee Employee { get; set; } = null!;

        [ForeignKey("StoreId")]
        public virtual Store? Store { get; set; }

    }

    [Table("ScheduleTemplates")]
    public class ScheduleTemplate
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        // Repetimos os campos aqui para evitar problemas de herança no mapeamento
        [MaxLength(5)] public string? ShiftStart { get; set; } = "07:00";
        [MaxLength(5)] public string? ShiftEnd { get; set; } = "11:00";
        [MaxLength(5)] public string? ShiftStart2 { get; set; } = "13:00";
        [MaxLength(5)] public string? ShiftEnd2 { get; set; } = "17:20";
        [MaxLength(100)] public string WorkDays { get; set; } = "Seg,Ter,Qua,Qui,Sex,Sab";
    }
}