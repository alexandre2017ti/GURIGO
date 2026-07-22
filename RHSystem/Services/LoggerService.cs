using System.IO;

public static class LoggerService
{


    private static string LogPath => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "RHSystem", "logs.txt");

    public static void Log(string message)
    {

        try
        {
            string folder = Path.GetDirectoryName(LogPath);
            if (!Directory.Exists(folder)) Directory.CreateDirectory(folder);

            string logLine = $"[{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}] {message}{Environment.NewLine}";
            File.AppendAllText(LogPath, logLine);
        }
        catch { /* Falha no log não deve travar o app */ }
    }
}