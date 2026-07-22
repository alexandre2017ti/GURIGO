using RHSystem;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("AbsenceJustifications")]
public class AbsenceJustification
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    public int EmployeeId { get; set; }

    [Required]
    public string Date { get; set; }

    [Required]
    [MaxLength(100)]
    public string Type { get; set; }

    public string? Description { get; set; }
    public string? ImageBase64 { get; set; }

    public bool IsAbonado { get; set; }

    [ForeignKey("EmployeeId")]
    public virtual Employee Employee { get; set; } = null!;

    public string? DriveFileId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}