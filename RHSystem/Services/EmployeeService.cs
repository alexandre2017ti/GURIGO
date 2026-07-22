using Microsoft.EntityFrameworkCore;
using RHSystem.Models;
using RHSystem.Desktop.Data;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace RHSystem.Services
{
    public class EmployeeService
    {
        private readonly DbContextOptions<AppDbContext> _testOptions;

        // Construtor flexível: aceita opções de teste ou fica nulo (para usar Postgres)
        public EmployeeService(DbContextOptions<AppDbContext> testOptions = null)
        {
            _testOptions = testOptions;
        }

        // A Fábrica que decide qual banco criar
        private AppDbContext CreateDbContext()
        {
            return _testOptions != null ? new AppDbContext(_testOptions) : new AppDbContext();
        }
        // 1. Busca todos os funcionários (Ativos e Inativos)
        public async Task<List<Employee>> GetAllAsync()
        {
            using var db = new AppDbContext();
            // Usamos AsNoTracking para performance, já que é apenas leitura para a lista
            return await db.Employees.AsNoTracking().ToListAsync();
        }

        // 2. Salvamento com as regras de limpeza de objetos virtuais
        public async Task SaveAsync(Employee emp)
        {
            using var db = new AppDbContext();
            // Use o valor real (.Value) apenas se não for nulo
            if (emp.AdmissionDate.HasValue)
            {
                emp.AdmissionDate = DateTime.SpecifyKind(emp.AdmissionDate.Value, DateTimeKind.Utc);
            }
            

            // Proteção para o EF não tentar criar/validar entidades relacionadas
            emp.Store = null;
            emp.SchedulesHistory.Clear();

            if (emp.Id == 0)
            {
                db.Employees.Add(emp);
            }
            else
            {
                db.Employees.Update(emp);
            }

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message;
                throw new Exception($"Erro ao salvar no banco: {inner ?? ex.Message}");
            }
        }

        // 3. Inativação ou Reativação em massa
        public async Task SetActiveStatusAsync(List<int> ids, bool status)
        {
            using var db = new AppDbContext();
            var employees = await db.Employees
                .Where(e => ids.Contains(e.Id))
                .ToListAsync();

            foreach (var emp in employees)
            {
                emp.IsActive = status;

                // ✨ A REGRA DE OURO DA REATIVAÇÃO:
                // Se estamos reativando (status == true), obrigatoriamente apagamos a data de demissão.
                if (status)
                {
                    emp.ResignationDate = null;
                }
            }

            await db.SaveChangesAsync();
        }

        // 4. Script de Integridade (Crucial para as novas colunas)

        public async Task<Employee?> GetByPinAndStoreAsync(string pin, int currentStoreId)
        {
            using var db = new AppDbContext();

            var emp = await db.Employees
                .FirstOrDefaultAsync(e => e.Pin == pin && e.IsActive);

            if (emp == null) return null;

            // Lógica de Trânsito: Se (Loja Correta) OU (Permissão de Rede)
            bool hasGlobalAccess = emp.CanPunchInAnyStore ?? false;

            if (emp.StoreId == currentStoreId || hasGlobalAccess)
            {
                return emp;
            }

            return null; // Acesso negado
        }
    }
}