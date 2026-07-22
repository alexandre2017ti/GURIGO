using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using RHSystem.Desktop.Data;
using System;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations.Schema; // Necessário para ler o Identity

namespace RHSystem.Services
{
    public class DatabaseUpgradeService
    {
        private readonly Func<string, object, Task> _sendToReact;

        public DatabaseUpgradeService(Func<string, object, Task> sendToReact)
        {
            _sendToReact = sendToReact;
        }
        private readonly DbContextOptions<AppDbContext> _testOptions;

        // Construtor flexível: aceita opções de teste ou fica nulo (para usar Postgres)
        public DatabaseUpgradeService(DbContextOptions<AppDbContext> testOptions = null)
        {
            _testOptions = testOptions;
        }

        // A Fábrica que decide qual banco criar
        private AppDbContext CreateDbContext()
        {
            return _testOptions != null ? new AppDbContext(_testOptions) : new AppDbContext();
        }

        public async Task CheckAndUpgradeAsync()
        {
            using var db = new AppDbContext();
            try
            {
                await db.Database.EnsureCreatedAsync();
                await db.GarantirTriggersEFuncoesAsync();
                var connection = db.Database.GetDbConnection();
                if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();

                var entityTypes = db.Model.GetEntityTypes();

                foreach (var entity in entityTypes)
                {
                    string tableName = entity.GetTableName().Replace("\"", "");
                    await _sendToReact?.Invoke("loading-status", $"Sincronizando {tableName}...");

                    // Verifica se a tabela existe, se não, cria com a lógica de SERIAL
                    await EnsureTableExistsAsync(connection, tableName, entity);

                    foreach (var prop in entity.GetProperties())
                    {
                        if (prop.IsPrimaryKey() || prop.IsShadowProperty()) continue;

                        string columnName = prop.GetColumnName().Replace("\"", "");
                        string targetType = GetPostgresType(prop.ClrType);
                        var currentType = await GetColumnTypeAsync(connection, tableName, columnName);

                        if (currentType == null)
                        {
                            string defaultValue = targetType == "TEXT" ? "DEFAULT ''" : "";
                            await ExecuteSql(connection, $"ALTER TABLE \"{tableName}\" ADD COLUMN IF NOT EXISTS \"{columnName}\" {targetType} {defaultValue};");
                        }
                        else if (!IsTypeCompatible(currentType, targetType))
                        {
                            await ExecuteSql(connection, $"ALTER TABLE \"{tableName}\" ALTER COLUMN \"{columnName}\" TYPE {targetType} USING \"{columnName}\"::{targetType};");
                        }
                    }
                    try
                    {
                        await _sendToReact?.Invoke("loading-status", "Ajustando tamanho das colunas...");
                        await ExecuteSql(connection, @"
                        DO $$
                        BEGIN
                            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TimeRecords' AND column_name = 'ManualStatus') THEN
                                ALTER TABLE ""TimeRecords"" ALTER COLUMN ""ManualStatus"" TYPE VARCHAR(100);
                            END IF;

                            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AbsenceJustifications' AND column_name = 'Type') THEN
                                ALTER TABLE ""AbsenceJustifications"" ALTER COLUMN ""Type"" TYPE VARCHAR(100);
                            END IF;
                        END
                        $$;
                    ");
                        Debug.WriteLine("✅ Colunas redimensionadas para 100 caracteres com sucesso.");
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"⚠️ Aviso ao redimensionar colunas: {ex.Message}");
                    }
                }
                await Task.Delay(200);
                await _sendToReact?.Invoke("app-ready", null);
            }
            catch (Exception ex) { Debug.WriteLine($"❌ Erro: {ex.Message}"); }
        }

        private async Task EnsureTableExistsAsync(System.Data.Common.DbConnection conn, string tableName, IEntityType entityType)
        {
            // 1. Usamos 'IF NOT EXISTS' diretamente no SQL para evitar o erro 42P07 do Postgres
            Debug.WriteLine($"🚀 Verificando/Criando tabela: {tableName}");

            var props = entityType.GetProperties()
                .Where(p => !p.IsShadowProperty())
                .Select(p => {
                    string name = p.GetColumnName().Replace("\"", "");
                    string type = GetPostgresType(p.ClrType);

                    // Lógica de SERIAL para IDs
                    if (p.IsPrimaryKey() && (p.ClrType == typeof(int) || p.ClrType == typeof(long)))
                        return $"\"{name}\" SERIAL PRIMARY KEY";

                    return $"\"{name}\" {type}";
                });

            // Adicionado IF NOT EXISTS como trava de segurança final
            string sqlCreate = $"CREATE TABLE IF NOT EXISTS \"{tableName}\" ({string.Join(", ", props)});";

            try
            {
                await ExecuteSql(conn, sqlCreate);
            }
            catch (Exception ex)
            {
                // Se a tabela já existir, o Postgres pode reclamar dependendo da versão, 
                // então capturamos o erro e apenas seguimos adiante
                Debug.WriteLine($"ℹ️ Tabela {tableName} já existente ou erro ignorado: {ex.Message}");
            }
        }

        private async Task<string> GetColumnTypeAsync(System.Data.Common.DbConnection conn, string table, string column)
        {
            using var cmd = conn.CreateCommand();
            // 2. Adicionado tratamento de erro para evitar que um retorno nulo trave o loop de colunas
            cmd.CommandText = "SELECT data_type FROM information_schema.columns WHERE LOWER(table_name) = LOWER(@t) AND LOWER(column_name) = LOWER(@c)";

            var p1 = cmd.CreateParameter(); p1.ParameterName = "@t"; p1.Value = table;
            var p2 = cmd.CreateParameter(); p2.ParameterName = "@c"; p2.Value = column;
            cmd.Parameters.Add(p1); cmd.Parameters.Add(p2);

            var result = await cmd.ExecuteScalarAsync();
            return result?.ToString(); // O uso do '?' evita erro de cast se o resultado for nulo
        }

        private bool IsTypeCompatible(string current, string target)
        {
            current = current.ToUpper();
            if (current == "CHARACTER VARYING" && target == "TEXT") return true;
            if (current == "TIMESTAMP WITHOUT TIME ZONE" && target == "TIMESTAMP") return true;
            if (current == "CHARACTER VARYING" && target == "TEXT") return true;
            return current == target;
        }

        private string GetPostgresType(Type type)
        {
            var coreType = Nullable.GetUnderlyingType(type) ?? type;
            if (coreType == typeof(string)) return "TEXT";
            if (coreType == typeof(int)) return "INTEGER";
            if (coreType == typeof(bool)) return "BOOLEAN";
            if (coreType == typeof(DateTime)) return "TIMESTAMP";
            if (coreType == typeof(double) || coreType == typeof(decimal)) return "NUMERIC";
            return "TEXT";
        }

        private async Task ExecuteSql(System.Data.Common.DbConnection conn, string sql)
        {
            using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            await cmd.ExecuteNonQueryAsync();
        }
    }
}