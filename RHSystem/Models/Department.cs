using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RHSystem.Models
{
    [Table("Departments")]
    public class Department
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = "";

        // Tornamos a Loja opcional para evitar o erro de FK no banco
        public int? StoreId { get; set; }

        [ForeignKey("StoreId")]
        public virtual Store? Store { get; set; }
    }
}