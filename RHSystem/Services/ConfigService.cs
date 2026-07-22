using Microsoft.EntityFrameworkCore;
using RHSystem.Desktop.Data;
using System;
using System.IO;

namespace RHSystem.Services
{
    // Classe de modelo de configuração movida para o namespace de Models ou junto ao Service
    public class AppConfig
    {
        public string Mode { get; set; }        // "Admin", "Kiosk", "Login"
        public string StoreCode { get; set; }
        public string StoreName { get; set; }
    }

    public class ConfigService
    {
        private readonly DbContextOptions<AppDbContext> _testOptions;

        // Construtor flexível: aceita opções de teste ou fica nulo (para usar Postgres)
        public ConfigService(DbContextOptions<AppDbContext> testOptions = null)
        {
            _testOptions = testOptions;
        }

        // A Fábrica que decide qual banco criar
        private AppDbContext CreateDbContext()
        {
            return _testOptions != null ? new AppDbContext(_testOptions) : new AppDbContext();
        }
        public string GetConfigPath()
        {
            string folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "RHSystem");
            if (!Directory.Exists(folder)) Directory.CreateDirectory(folder);
            return Path.Combine(folder, "database.dat");
        }
    }
}