using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RHSystem.Models
{
    [Table("ServiceProviders")]
    public class ServiceProvider
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string RazaoSocial { get; set; }

        [Required]
        public string Cnpj { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Relacionamento reverso: Uma prestadora atende várias lojas
        public virtual ICollection<Store> Stores { get; set; }
    }
}