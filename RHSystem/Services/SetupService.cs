using Microsoft.EntityFrameworkCore;
using RHSystem.Desktop.Data;
using RHSystem.Helpers;
using System.IO;
using System.Text.Json;

namespace RHSystem.Services
{
    public class SetupService
    {

        private readonly DbContextOptions<AppDbContext> _testOptions;

        // Construtor flexível: aceita opções de teste ou fica nulo (para usar Postgres)
        public SetupService(DbContextOptions<AppDbContext> testOptions = null)
        {
            _testOptions = testOptions;
        }

        // A Fábrica que decide qual banco criar
        private AppDbContext CreateDbContext()
        {
            return _testOptions != null ? new AppDbContext(_testOptions) : new AppDbContext();
        }
        private readonly ConfigService _configService = new ConfigService();

        // Tenta carregar a ConnectionString do arquivo criptografado
        public bool TryLoadConnectionString()
        {
            string dbFile = _configService.GetConfigPath();
            if (!File.Exists(dbFile)) return false;

            try
            {
                var encryptedJson = File.ReadAllText(dbFile);
                var json = SecurityHelper.Decrypt(encryptedJson);
                var config = JsonSerializer.Deserialize<DatabaseSettings>(json);

                if (config != null)
                {
                    DbGlobals.ConnectionString = $"Host={config.Host};Port={config.Port};Database={config.Database};Username={config.Username};Password={config.Password};Include Error Detail=true";
                    return true;
                }
            }
            catch { /* Log ou tratamento silencioso */ }
            return false;
        }

        // Salva a nova configuração após teste de sucesso
        public void SaveDatabaseConfig(DatabaseSettings settings)
        {
            var configJson = JsonSerializer.Serialize(settings);
            var encryptedConfig = SecurityHelper.Encrypt(configJson);
            File.WriteAllText(_configService.GetConfigPath(), encryptedConfig);

            DbGlobals.ConnectionString = $"Host={settings.Host};Port={settings.Port};Database={settings.Database};Username={settings.Username};Password={settings.Password}";
        }
    }
}