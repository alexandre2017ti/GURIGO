using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using RHSystem.Models;

namespace RHSystem
{
    [Table("Employees")]
    public class Employee
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = "";

        public string? Cpf { get; set; }
        public string Ctps { get; set; }
        public string Serie { get; set; }
        public string? ShiftStart { get; set; }
        public bool RequireFacialAuth { get; set; } = false;
        public string FacialReferenceData { get; set; }

        // --- NOVOS CAMPOS ---
        public string? Phone { get; set; }
        public string? EmergencyContact { get; set; } // Nome + Telefone do contato

        // Endereço (Pode ser uma string única ou dividida)
        public string? Address { get; set; }
        // --------------------
        public DateTime? ResignationDate { get; set; }

        public int? DepartmentId { get; set; } // O funcionário aponta para o setor

        [ForeignKey("DepartmentId")]
        public virtual Department? Department { get; set; }

        public string? Role { get; set; }
        public string? Pin { get; set; }

        public int StoreId { get; set; }
        public int Regime { get; set; }
        public bool IsActive { get; set; } = true;
        public bool? CanPunchInAnyStore { get; set; } = false;
        public DateTime? AdmissionDate { get; set; } = DateTime.UtcNow;
        [ForeignKey("StoreId")]
        public virtual Store? Store { get; set; }
        public virtual ICollection<Schedule> SchedulesHistory { get; set; } = new List<Schedule>();
    }
}