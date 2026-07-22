using Microsoft.EntityFrameworkCore;
using RHSystem.Desktop.Data;
using RHSystem.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace RHSystem.Services
{
    public class DepartmentService
    {

        private readonly DbContextOptions<AppDbContext> _testOptions;

        // Construtor flexível: aceita opções de teste ou fica nulo (para usar Postgres)
        public DepartmentService(DbContextOptions<AppDbContext> testOptions = null)
        {
            _testOptions = testOptions;
        }

        // A Fábrica que decide qual banco criar
        private AppDbContext CreateDbContext()
        {
            return _testOptions != null ? new AppDbContext(_testOptions) : new AppDbContext();
        }
        // REMOVEMOS a variável global _db para evitar conexões mortas

        public async Task<List<Department>> GetDepartmentsAsync()
        {
            using var db = CreateDbContext(); // ✅ AGORA SIM ELE PUXA A MEMÓRIA RAM
            return await db.Departments.OrderBy(d => d.Name)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task SaveDepartmentAsync(Department department)
        {
            using var db = new AppDbContext();

            // Agora o código aceita StoreId como null ou 0
            if (department.StoreId == 0) department.StoreId = null;

            if (department.Id == 0)
                db.Departments.Add(department);
            else
                db.Departments.Update(department);

            await db.SaveChangesAsync();
        }

        public async Task DeleteDepartmentByNameAsync(string name)
        {
            using var db = new AppDbContext();
            var dept = await db.Departments.FirstOrDefaultAsync(d => d.Name == name);
            if (dept != null)
            {
                db.Departments.Remove(dept);
                await db.SaveChangesAsync();
            }
        }
    }
}