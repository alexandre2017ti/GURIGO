using Microsoft.EntityFrameworkCore;
using RHSystem.Models;
using RHSystem.Desktop.Data;

namespace RHSystem.Services
{
    public class SettingsService
    {
        private readonly DbContextOptions<AppDbContext> _testOptions;

        // Construtor flexível: aceita opções de teste ou fica nulo (para usar Postgres)
        public SettingsService(DbContextOptions<AppDbContext> testOptions = null)
        {
            _testOptions = testOptions;
        }

        // A Fábrica que decide qual banco criar
        private AppDbContext CreateDbContext()
        {
            return _testOptions != null ? new AppDbContext(_testOptions) : new AppDbContext();
        }

        // Busca a configuração única (ID 1)
        public async Task<CompanySetting> GetSettingsAsync()
        {
            using var db = new AppDbContext();
            var settings = await db.CompanySettings.FirstOrDefaultAsync(s => s.Id == 1);

            if (settings == null)
            {
                settings = new CompanySetting { Id = 1, IsServiceProviderMode = false };
                db.CompanySettings.Add(settings);
                await db.SaveChangesAsync();
            }
            return settings;
        }

        // Salva ou atualiza os parâmetros
        public async Task SaveSettingsAsync(CompanySetting settings)
        {
            using var db = new AppDbContext();

            // 1. Buscamos a configuração atual no banco (sempre a linha Id = 1)
            var existing = await db.CompanySettings.FirstOrDefaultAsync(s => s.Id == 1);

            if (existing != null)
            {
                // ✨ DINAMISMO TOTAL: 
                // Pegamos o que o Admin digitou (settings) e passamos para o banco (existing)
                existing.GlobalRazaoSocial = settings.GlobalRazaoSocial;
                existing.GlobalCnpj = settings.GlobalCnpj;
                existing.IsServiceProviderMode = settings.IsServiceProviderMode;
                existing.GoogleDriveFolderId = settings.GoogleDriveFolderId;

                // Avisamos o EF que a linha foi alterada
                db.Entry(existing).State = EntityState.Modified;
            }
            else
            {
                // Caso seja a primeira vez configurando o sistema
                settings.Id = 1;
                db.CompanySettings.Add(settings);
            }

            await db.SaveChangesAsync();
        }
    }
}