using Microsoft.EntityFrameworkCore;
using RHSystem.Models;
using RHSystem.Desktop.Data;

namespace RHSystem.Services
{
    public class StoreService
    {
        private readonly DbContextOptions<AppDbContext> _testOptions;

        // Construtor flexível: aceita opções de teste ou fica nulo (para usar Postgres)
        public StoreService(DbContextOptions<AppDbContext> testOptions = null)
        {
            _testOptions = testOptions;
        }

        // A Fábrica que decide qual banco criar
        private AppDbContext CreateDbContext()
        {
            return _testOptions != null ? new AppDbContext(_testOptions) : new AppDbContext();
        }
        public async Task<List<Store>> GetStoresAsync()
        {
            using var db = new AppDbContext();
            return await db.Stores.AsNoTracking().ToListAsync();
        }

        public async Task SaveStoreAsync(Store store)
        {
            using var db = new AppDbContext();
            if (store.Id == 0)
            {
                if (string.IsNullOrEmpty(store.AccessCode))
                    store.AccessCode = Guid.NewGuid().ToString().Substring(0, 6).ToUpper();
                db.Stores.Add(store);
            }
            else
            {
                db.Entry(store).State = EntityState.Modified;
            }
            await db.SaveChangesAsync();
        }
        
    }
}