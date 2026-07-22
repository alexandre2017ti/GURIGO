using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RHSystem.Models
{
    [Table("CompanySettings")]
    public class CompanySetting
    {
        public int SchemaVersion { get; set; } = 2;
        [Key]
        public int Id { get; set; }
        public string TimeZoneId { get; set; } = "SA Western Standard Time";
        public string? AppMode { get; set; }
        public string? StoreName { get; set; }
        public string? StoreCode { get; set; }
        public string? CompanyName { get; set; }
        public string? Cnpj { get; set; }
        public string? GoogleDriveFolderId { get; set; }

        // MODO DE OPERAÇÃO: 
        // true = Cada loja pode ter um CNPJ/Empregador diferente (Prestação de Serviço)
        // false = O sistema usa os dados globais abaixo para todas as unidades
        public bool IsServiceProviderMode { get; set; } = false;

        // DADOS GLOBAIS (Usados se IsServiceProviderMode for false)
        public string? GlobalRazaoSocial { get; set; }
        public string? GlobalCnpj { get; set; }

        // Outros parâmetros futuros que podemos colocar aqui:
        // public int ToleranceMinutes { get; set; } = 5;
    }
}