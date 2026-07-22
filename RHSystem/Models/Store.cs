using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace RHSystem.Models
{
    [Table("Stores")]
    public class Store
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string AccessCode { get; set; }
        public string Address { get; set; } = string.Empty;

        // Campos de Endereço
        public string Cep { get; set; }
        public string Logradouro { get; set; } = "";
        public string Numero { get; set; } = "";
        public string Bairro { get; set; } = "";
        public string Cidade { get; set; } = "";
        public string Estado { get; set; } = "";

        public string? RazaoSocialCustom { get; set; }
        public string? CnpjCustom { get; set; }
        public bool? UseServiceProvider { get; set; } = false;
        public int? ServiceProviderId { get; set; }
        public bool? IsOutsourced { get; set; } = false;

        // ✨ RELACIONAMENTO REAL (Sem NotMapped)
        [ForeignKey("ServiceProviderId")]
        [JsonIgnore]
        public virtual ServiceProvider? ServiceProvider { get; set; }

        [NotMapped]
        public string EnderecoCompleto => $"{Logradouro}, {Numero} - {Bairro}, {Cidade}/{Estado}";
    }
}