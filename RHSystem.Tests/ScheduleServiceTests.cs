using RHSystem.Models;
using RHSystem.Services;
using System;
using Xunit;

namespace RHSystem.Tests
{
    public class ScheduleServiceTests
    {
        // Como a função GetExpectedSeconds faz apenas matemática e não acessa o banco, 
        // nós não precisamos do In-Memory aqui! O teste roda na velocidade da luz.
        private readonly ScheduleService _service = new ScheduleService();

        [Theory]
        [InlineData("00:00", "00:00")]
        [InlineData(null, null)]
        [InlineData("   ", "")]
        [InlineData("Invalido", "Texto")]
        public void GetExpectedSeconds_Turno2Lixo_DeveCalcularApenasTurno1(string start2, string end2)
        {
            // 1. ARRANGE
            var schedule = new Schedule
            {
                WorkDays = "seg,ter,qua,qui,sex",
                ShiftStart = "08:00",
                ShiftEnd = "12:00",
                ShiftStart2 = start2, // Injetando o "lixo" do InlineData
                ShiftEnd2 = end2
            };

            // Uma segunda-feira (para garantir que cai num dia de trabalho)
            var dataTeste = new DateTime(2026, 03, 09);

            // 2. ACT
            var resultSeconds = _service.GetExpectedSeconds(schedule, dataTeste);

            // 3. ASSERT
            // Das 08:00 às 12:00 são 4 horas = 14400 segundos
            Assert.Equal(14400, resultSeconds);
        }

        [Fact]
        public void GetExpectedSeconds_DiaDeFolga_DeveRetornarZero()
        {
            // 1. ARRANGE
            var schedule = new Schedule
            {
                WorkDays = "seg,ter,qua,qui,sex", // Sábado e Domingo de folga
                ShiftStart = "08:00",
                ShiftEnd = "18:00"
            };
            var domingo = new DateTime(2026, 03, 08);

            // 2. ACT
            var resultSeconds = _service.GetExpectedSeconds(schedule, domingo);

            // 3. ASSERT
            Assert.Equal(0, resultSeconds);
        }

        [Fact]
        public void GetExpectedSeconds_TurnoMadrugada_NaoDeveRetornarNegativo()
        {
            // 1. ARRANGE
            var schedule = new Schedule
            {
                WorkDays = "seg,ter,qua",
                ShiftStart = "22:00",
                ShiftEnd = "06:00", // Virou a noite!
                ShiftStart2 = "",
                ShiftEnd2 = ""
            };
            var tercaFeira = new DateTime(2026, 03, 10);

            // 2. ACT
            var resultSeconds = _service.GetExpectedSeconds(schedule, tercaFeira);

            // 3. ASSERT
            // Das 22h às 06h são 8 horas = 28800 segundos
            Assert.True(resultSeconds > 0, "O cálculo de horas deu negativo!");
            Assert.Equal(28800, resultSeconds);
        }
    }
}