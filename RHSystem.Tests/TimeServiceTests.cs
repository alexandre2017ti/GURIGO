using Microsoft.EntityFrameworkCore;
using RHSystem.Desktop.Data;
using RHSystem.Models;
using RHSystem.Services;
using System;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace RHSystem.Tests
{
    public class TimeServiceTests
    {
        // Cria a ligação para a memória RAM (Banco de dados de mentira)
        private DbContextOptions<AppDbContext> GetInMemoryOptions()
        {
            return new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
        }

        [Fact]
        public async Task CalculateEmployeePeriodAsync_AtestadoParcial_DeveDescontarMetaEGerarZeroSaldo()
        {
            var options = GetInMemoryOptions();
            using (var db = new AppDbContext(options))
            {
                var ana = new Employee { Id = 1, Name = "Ana Silva", Ctps = "123", Serie = "12" };
                db.Employees.Add(ana);

                db.Schedules.Add(new Schedule
                {
                    EmployeeId = ana.Id,
                    ScheduleType = "FIXED",
                    ShiftStart = "08:00",
                    ShiftEnd = "12:00",
                    ShiftStart2 = "13:00",
                    ShiftEnd2 = "17:00",
                    WorkDays = "Seg,Ter,Qua,Qui,Sex,Sab",
                    OffDay = "Dom",
                    RosterDaysJson = ""
                });

                db.AbsenceJustifications.Add(new AbsenceJustification
                {
                    EmployeeId = ana.Id,
                    Date = "2026-03-05",
                    // ✨ IMPORTANTE: Certifique-se que o TimeService consegue dar Split ou ler este formato
                    Type = "ATESTADO - 08:00-12:00",
                    DriveFileId = ""
                });

                db.TimeRecords.Add(new TimeRecord { EmployeeId = 1, StoreId = 1, Date = "2026-03-05", Time = "13:00", Type = "SISTEMA", ManualStatus = "NORMAL" });
                db.TimeRecords.Add(new TimeRecord { EmployeeId = 1, StoreId = 1, Date = "2026-03-05", Time = "17:00", Type = "SISTEMA", ManualStatus = "NORMAL" });

                await db.SaveChangesAsync();
            }

            var service = new TimeService(options);
            var dataTeste = new DateTime(2026, 3, 5);

            var resultList = await service.CalculateEmployeePeriodAsync(1, dataTeste, dataTeste);
            var resultDia = resultList.First();

            // 1. A meta do dia na tela NÃO muda, continua sendo 8 horas (480 minutos)
            Assert.Equal(480, resultDia.ExpectedMins);

            // 2. A Ana trabalhou das 13:00 às 17:00 (240 minutos)
            Assert.Equal(240, resultDia.WorkedMins);

            // 3. A Ana teve um atestado das 08:00 às 12:00 (240 minutos)
            Assert.Equal(240, resultDia.AbonoMins);

            // 4. Saldo final: 480 (Meta) - 240 (Trabalho) - 240 (Abono) = ZERO!
            Assert.Equal(0, resultDia.BalanceMins);
        }
    }
    
}