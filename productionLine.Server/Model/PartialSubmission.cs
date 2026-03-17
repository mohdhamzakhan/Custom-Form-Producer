// Model/PartialSubmission.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace productionLine.Server.Model
{
    [Table("FF_PARTIALSUBMISSION")]
    public class PartialSubmission
    {
        [Key]
        [Column("ID")]
        public long Id { get; set; }

        [Required]
        [Column("FORMID")]
        public int FormId { get; set; }

        // Token sent via email to the second filler
        [Required]
        [Column("TOKEN")]
        public string Token { get; set; } = Guid.NewGuid().ToString();

        // Email of the person who should complete the form
        [Required]
        [Column("ASSIGNEDTOEMAIL")]
        public string AssignedToEmail { get; set; }

        [Column("ASSIGNEDTONAME")]
        public string? AssignedToName { get; set; }

        // Who did the partial fill
        [Column("FILLEDBY")]
        public string? FilledBy { get; set; }

        [Column("CREATEDAT")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [Column("COMPLETEDAT")]
        public DateTime? CompletedAt { get; set; }

        // "Pending" = waiting for second filler, "Completed" = second filler done
        [Column("STATUS")]
        public string Status { get; set; } = "Pending";

        // JSON of fields already filled (locked for second filler)
        [Column("FILLEDDATA", TypeName = "CLOB")]
        public string? FilledDataJson { get; set; }

        // Which field IDs were filled in the first pass (to disable them)
        [Column("FILLEDFIELDS", TypeName = "CLOB")]
        public string? FilledFieldsJson { get; set; }

        [ForeignKey(nameof(FormId))]
        public Form Form { get; set; }

        // After completion, this links to the actual FormSubmission
        [Column("SUBMISSIONID")]
        public long? SubmissionId { get; set; }
    }
}