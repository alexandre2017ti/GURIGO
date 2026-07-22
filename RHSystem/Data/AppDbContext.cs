using Microsoft.EntityFrameworkCore;
using Npgsql;
using RHSystem;
using RHSystem.Models;
using System;
using System.Threading.Tasks;

namespace RHSystem.Desktop.Data
{
    public static class DbGlobals
    {
        public static string ConnectionString { get; set; } = "";
        public static bool IsConfigured => !string.IsNullOrEmpty(ConnectionString);
    }

    public class DatabaseSettings
    {
        public string Host { get; set; }
        public string Port { get; set; } = "5432";
        public string Database { get; set; } = "rhsystem";
        public string Username { get; set; } = "postgres";
        public string Password { get; set; }
    }

    public class AppDbContext : DbContext
    {
        public DbSet<Employee> Employees { get; set; }
        public DbSet<Store> Stores { get; set; }
        public DbSet<TimeRecord> TimeRecords { get; set; }
        public DbSet<Vacation> Vacations { get; set; }
        public DbSet<Schedule> Schedules { get; set; }
        public DbSet<ScheduleTemplate> ScheduleTemplates { get; set; }
        public DbSet<Department> Departments { get; set; }
        public DbSet<CompanySetting> CompanySettings { get; set; }
        public DbSet<AbsenceJustification> AbsenceJustifications { get; set; }
        public DbSet<ServiceProvider> ServiceProviders { get; set; }

        public AppDbContext() { }
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            

            // 1. MAPEAMENTO DE TABELAS (Garante nomes corretos no Postgres)
            modelBuilder.Entity<Employee>().ToTable("Employees");
            modelBuilder.Entity<Store>().ToTable("Stores");
            modelBuilder.Entity<Schedule>().ToTable("Schedules");
            modelBuilder.Entity<CompanySetting>().ToTable("CompanySettings");
            modelBuilder.Entity<AbsenceJustification>().ToTable("AbsenceJustifications");

            modelBuilder.Entity<TimeRecord>().Property(b => b.IsJustified).HasDefaultValue(false);
            modelBuilder.Entity<TimeRecord>().Property(b => b.IsAbono).HasDefaultValue(false);
            modelBuilder.Entity<TimeRecord>().Property(b => b.IsMedical).HasDefaultValue(false);

            // 2. CONFIGURAÇÃO DA RELAÇÃO 1:N
            modelBuilder.Entity<Schedule>()
                .HasOne(s => s.Employee)
                .WithMany(e => e.SchedulesHistory)
                .HasForeignKey(s => s.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Schedule>()
                .HasIndex(s => s.EmployeeId)
                .IsUnique(false);
            // 2. CONFIGURAÇÃO DA RELAÇÃO 1:1
            /*modelBuilder.Entity<Employee>()
                .HasOne(e => e.Schedule)
                .WithOne(s => s.Employee)
                .HasForeignKey<Schedule>(s => s.EmployeeId);*/

            // 3. MAPEAMENTO GLOBAL DE COLUNAS (CASE SENSITIVE)
            foreach (var entity in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var property in entity.GetProperties())
                {
                    property.SetColumnName(property.Name);
                }
            }
        }
        public async Task GarantirTriggersEFuncoesAsync()
        {
            // O Entity Framework vai executar este script bruto direto no PostgreSQL
            string scriptSql = @"
                -- ✨ A MARRETADA: Destrói a trava antiga que impedia múltiplas escalas (Relação 1:1 legada)
                DROP INDEX IF EXISTS ""IX_Schedules_EmployeeId"";

                CREATE OR REPLACE FUNCTION fn_ajustar_fuso_horario()
                RETURNS TRIGGER AS $$
                DECLARE
                    data_hora_ajustada TIMESTAMP;
                BEGIN
                    -- Só calcula a hora atual se o C# enviar a data vazia ou nula
                    IF NEW.""Date"" IS NULL OR NEW.""Date"" = '' OR NEW.""Date"" = '0000-00-00' THEN
                        data_hora_ajustada := CURRENT_TIMESTAMP AT TIME ZONE 'UTC' - INTERVAL '4 hours';
                        NEW.""Date"" := to_char(data_hora_ajustada, 'YYYY-MM-DD');
                        NEW.""Time"" := to_char(data_hora_ajustada, 'HH24:MI:SS');
                    END IF;

                    NEW.""CreatedAt"" := CURRENT_TIMESTAMP AT TIME ZONE 'UTC';
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                -- Remove a trigger antiga se ela existir para recriar limpo
                DROP TRIGGER IF EXISTS trg_ajustar_fuso_horario ON ""TimeRecords"";

                -- Prende a Trigger na tabela TimeRecords
                CREATE TRIGGER trg_ajustar_fuso_horario
                BEFORE INSERT ON ""TimeRecords""
                FOR EACH ROW
                EXECUTE FUNCTION fn_ajustar_fuso_horario();
            ";

            try
            {
                await this.Database.ExecuteSqlRawAsync(scriptSql);
                System.Diagnostics.Debug.WriteLine("✅ Triggers, Funções e Travas do PostgreSQL aplicadas com sucesso!");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"❌ Erro ao criar Triggers no BD: {ex.Message}");
            }
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            // ✨ O RASTREADOR DE TESTES
            if (optionsBuilder.IsConfigured)
            {
                // Se já veio configurado de fora, é o nosso teste In-Memory agindo!
                System.Diagnostics.Debug.WriteLine("🧪 [BANCO DE DADOS] Rodando na MEMÓRIA RAM (Modo de Teste Isolado).");
            }
            else
            {
                // Se não veio configurado, é o sistema real pedindo a conexão normal
                System.Diagnostics.Debug.WriteLine("🐘 [BANCO DE DADOS] Conectando ao POSTGRESQL Real...");

                string conn = string.IsNullOrEmpty(DbGlobals.ConnectionString)
                    ? "Host=localhost;Database=rhsystem;Username=postgres;Password=provisorio"
                    : DbGlobals.ConnectionString;

                var builder = new NpgsqlConnectionStringBuilder(conn)
                {
                    Timeout = 30,
                    CommandTimeout = 30,
                    TrustServerCertificate = true,
                    Pooling = true
                };

                optionsBuilder.UseNpgsql(builder.ConnectionString);
            }
        }

        public void Seed()
        {
            using (var db = new AppDbContext())
            {
                var settings = db.CompanySettings.FirstOrDefault(s => s.Id == 1);
                if (settings == null)
                {
                    db.CompanySettings.Add(new CompanySetting
                    {
                        Id = 1,
                        IsServiceProviderMode = false,
                        GlobalRazaoSocial = "EMPRESA PADRÃO LTDA",
                        GlobalCnpj = "00.000.000/0000-00"
                    });
                    try { db.SaveChanges(); } catch (Exception ex) { System.Diagnostics.Debug.WriteLine("Erro Seed: " + ex.Message); }
                }
            }
        }

        // =========================================================================
        // ✨ O NOVO MOTOR DE ATUALIZAÇÃO AUTOMÁTICA (AUTO-SYNC SCHEMA)
        // =========================================================================
        public async Task AutoSyncSchemaAsync()
        {
            using var connection = new NpgsqlConnection(DbGlobals.ConnectionString);
            await connection.OpenAsync();

            foreach (var entityType in this.Model.GetEntityTypes())
            {
                var tableName = entityType.GetTableName();
                if (string.IsNullOrEmpty(tableName)) continue;

                foreach (var property in entityType.GetProperties())
                {
                    var columnName = property.GetColumnName();
                    var clrType = property.ClrType;

                    string expectedType = GetPostgresType(clrType);

                    // Busca se a coluna existe e QUAL É O TIPO DELA ATUALMENTE
                    string checkSql = @"
                        SELECT data_type 
                        FROM information_schema.columns 
                        WHERE table_name = @tableName AND column_name = @columnName";

                    using var cmdCheck = new NpgsqlCommand(checkSql, connection);
                    cmdCheck.Parameters.AddWithValue("tableName", tableName);
                    cmdCheck.Parameters.AddWithValue("columnName", columnName);

                    var currentTypeObj = await cmdCheck.ExecuteScalarAsync();

                    if (currentTypeObj == null)
                    {
                        // 1. COLUNA NÃO EXISTE: Vamos criar!
                        string defaultClause = clrType == typeof(bool) ? " DEFAULT FALSE" : "";
                        string addSql = $"ALTER TABLE \"{tableName}\" ADD COLUMN \"{columnName}\" {expectedType}{defaultClause};";

                        using var cmdAdd = new NpgsqlCommand(addSql, connection);
                        await cmdAdd.ExecuteNonQueryAsync();

                        System.Diagnostics.Debug.WriteLine($"✅ [DB-SYNC] Coluna CRIADA: {tableName}.{columnName} ({expectedType})");
                    }
                    else
                    {
                        // 2. COLUNA EXISTE: Vamos verificar se o tipo mudou!
                        string currentType = currentTypeObj.ToString().ToLower();

                        // Normalização básica (Postgres às vezes chama text de character varying)
                        if (currentType.Contains("character varying")) currentType = "text";

                        if (currentType != expectedType)
                        {
                            try
                            {
                                // O segredo está no USING. Ele diz ao Postgres: "Tente converter os dados antigos para o formato novo"
                                string alterSql = $"ALTER TABLE \"{tableName}\" ALTER COLUMN \"{columnName}\" TYPE {expectedType} USING \"{columnName}\"::{expectedType};";

                                using var cmdAlter = new NpgsqlCommand(alterSql, connection);
                                await cmdAlter.ExecuteNonQueryAsync();

                                System.Diagnostics.Debug.WriteLine($"⚠️ [DB-SYNC] Coluna ALTERADA: {tableName}.{columnName} de {currentType} para {expectedType}");
                            }
                            catch (Exception ex)
                            {
                                // Se a conversão falhar (ex: tentar converter "Texto" para Int), ele avisa no console para não derrubar o app
                                System.Diagnostics.Debug.WriteLine($"❌ [DB-SYNC] Falha ao converter {tableName}.{columnName}: {ex.Message}");
                            }
                        }
                    }
                }
            }
        }

        // Função auxiliar que traduz o tipo do C# para o tipo de coluna do PostgreSQL
        private string GetPostgresType(Type clrType)
        {
            var type = Nullable.GetUnderlyingType(clrType) ?? clrType;

            if (type == typeof(int)) return "integer";
            if (type == typeof(long)) return "bigint";
            if (type == typeof(bool)) return "boolean";
            if (type == typeof(DateTime)) return "timestamp without time zone";
            if (type == typeof(double)) return "double precision";
            if (type == typeof(decimal)) return "numeric";

            // Qualquer outra coisa (string, char, etc) tratamos como texto sem limite de tamanho
            return "text";
        }
    }
}