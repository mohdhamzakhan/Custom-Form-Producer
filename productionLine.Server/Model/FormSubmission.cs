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
        public int Id { get; set; }

        [Required]
        [Column("FORMID")]
        public int FormId { get; set; }

        [Column("SUBMITTEDAT")]
        public DateTime SubmittedAt { get; set; } = DateTime.Now;

        // Navigation property for form submission data
        [JsonPropertyName("submissionData")]
        public List<FormSubmissionData> SubmissionData { get; set; } = new List<FormSubmissionData>();
    }

    [Table("FF_FORMSUBMISSIONDATA")]
    public class FormSubmissionData
    {
        [Key]
        [Column("ID")]
        public int Id { get; set; }

        [Required]
        [Column("FIELDLABEL")]
        public string FieldLabel { get; set; }

        [Required]
        [Column("FIELDVALUE")]
        public string FieldValue { get; set; }

        [ForeignKey("FormSubmission")]
        [Column("FORMSUBMISSIONID")]
        public int FormSubmissionId { get; set; }

        [JsonIgnore] // Prevent infinite recursion during serialization
        public FormSubmission? FormSubmission { get; set; } // Make nullable to avoid validation error
    }
}