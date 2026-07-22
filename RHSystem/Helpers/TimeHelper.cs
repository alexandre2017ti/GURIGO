namespace RHSystem.Helpers
{
    public static class TimeHelper
    {
        public static string CurrentTimeZoneId { get; set; } = "SA Western Standard Time";
        public static string FormatTime(double seconds, bool showSign = false)
        {

            // Tratamento para valores nulos ou zero
            if (seconds == 0) return "00:00";

            // Verifica se o valor é negativo para gerenciar o sinal manualmente
            bool isNegative = seconds < 0;
            TimeSpan ts = TimeSpan.FromSeconds(Math.Abs(seconds));

            // Formata horas totais (suporta > 24h) e minutos
            string timeStr = $"{(int)ts.TotalHours:D2}:{ts.Minutes:D2}";

            if (isNegative) return "-" + timeStr;
            if (showSign && seconds > 0) return "+" + timeStr;

            return timeStr;
        }
        public static DateTime GetLocalTime()
        {
            DateTime horaGlobal = DateTime.UtcNow;

            try
            {
                // ✨ Busca as regras matemáticas exatas do fuso (incluindo horário de verão, se existir)
                TimeZoneInfo tz = TimeZoneInfo.FindSystemTimeZoneById(CurrentTimeZoneId);
                return TimeZoneInfo.ConvertTimeFromUtc(horaGlobal, tz);
            }
            catch
            {
                // Fallback de segurança se o Windows/Linux não achar o fuso digitado
                return horaGlobal.AddHours(-4);
            }
        }
    }
}