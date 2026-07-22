using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RHSystem.Models
{
    public class Vacation
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public DateTime CreatedAt { get; set; }
        public string StartDate { get; set; } // yyyy-MM-dd
        public string EndDate { get; set; }
        public string Status { get; set; } = "Requested"; // Requested, Approved, Rejected
        [ForeignKey("EmployeeId")]
        public virtual Employee? Employee { get; set; } // ✨ Adicione o "?" aqui!
    }
}