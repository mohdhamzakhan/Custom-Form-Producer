using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace productionLine.Server.Model
{
    [Table("FF_FORMSUBMISSION")]
    public class FormSubmission
    {
        [Key]
        [Column("ID")]
        public long Id { get; set; }

        [Required]
        [Column("FORMID")]
        public int FormId { get; set; }

        [Column("SUBMITTEDAT")]
        public DateTime SubmittedAt { get; set; } = DateTime.Now;

        [Column("SUBMITTEDBY")]
        public string? SubmittedBy { get; set; }

        // Navigation property for form submission data
        [JsonPropertyName("submissionData")]
        public List<FormSubmissionData> SubmissionData { get; set; } = new List<FormSubmissionData>();

        public Form Form { get; set; }  // Navigation to Form

        [JsonPropertyName("approvals")]
        public List<FormApproval> Approvals { get; set; } = new();


    }

    [Table("FF_FORMSUBMISSIONDATA")]
    public class FormSubmissionData
    {
        [Key]
        [Column("ID")]
        public long Id { get; set; }

        [Required]
        [Column("FIELDLABEL")]
        public string FieldLabel { get; set; }

        [Required]
        [Column("FIELDVALUE", TypeName = "CLOB")]
        public string FieldValue { get; set; }

        [ForeignKey("FormSubmission")]
        [Column("FORMSUBMISSIONID")]
        public long FormSubmissionId { get; set; }

        [JsonIgnore] // Prevent infinite recursion during serialization
        public FormSubmission? FormSubmission { get; set; } // Make nullable to avoid validation error
    }
}