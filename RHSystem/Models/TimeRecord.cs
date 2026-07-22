using RHSystem;
using RHSystem.Models; // Garanta que o namespace da classe Store está aqui
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace RHSystem
{
    [Table("TimeRecords")]
    public class TimeRecord
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public int? StoreId { get; set; }
        public string Time { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Date { get; set; }
        public string ?Observation { get; set; } // Motivo da ocorrência
        public bool IsJustified { get; set; } = false; // Justificado sem abono
        public bool IsAbono { get; set; } = false; // Horas abonadas pela empresa
        public bool IsMedical { get; set; } = false; // Horas cobertas por atestado
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        [MaxLength(100)]
        public string? ManualStatus { get; set; } = "NORMAL";

        [ForeignKey("StoreId")]
        public virtual Store Store { get; set; }
        [ForeignKey("EmployeeId")]
        public virtual Employee Employee { get; set; }

    }
}