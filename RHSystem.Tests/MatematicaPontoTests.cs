using Xunit;
using System;

namespace RHSystem.Tests
{
    public class MatematicaPontoTests
    {
        // O [Fact] é a etiqueta que diz ao Visual Studio: "Isto é um teste automatizado, rode-o!"
        [Fact]
        public void CalcularDiferenca_DuasBatidasComuns_DeveRetornarTempoCorreto()
        {
            // 1. ARRANGE (Preparar o cenário)
            // Aqui fingimos que puxamos essas batidas do banco de dados
            TimeSpan entrada = TimeSpan.Parse("08:00");
            TimeSpan saida = TimeSpan.Parse("12:00");

            // 2. ACT (Agir - Fazer a conta que o seu sistema faria)
            TimeSpan totalTrabalhado = saida - entrada;

            // 3. ASSERT (Verificar se a máquina acertou)
            // Nós esperamos que a diferença seja de exatas 4 horas (240 minutos)
            int minutosEsperados = 240;
            int minutosReais = (int)totalTrabalhado.TotalMinutes;

            // Se o Assert bater, o teste passa (Verde). Se for diferente, o teste falha (Vermelho).
            Assert.Equal(minutosEsperados, minutosReais);
        }
    }
}