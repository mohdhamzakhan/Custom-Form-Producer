using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace productionLine.Server.Model
{
    [Table("FF_FORMSIGNATURE")]
    public class FormSignature
    {
        [Key]
        [Column("ID")]
        public long Id { get; set; }
        [Column("FORMSUBMISSIONID")]
        public int FormSubmissionId { get; set; }
        [Column("FIELDLABEL")]
        public string FieldLabel { get; set; }
        [Column("SIGNATUREDATA")]
        public string SignatureData { get; set; } // Base64 string
        [Column("SIGNEDAT")]
        public DateTime SignedAt { get; set; }

        public FormSubmission FormSubmission { get; set; }
    }

    public class SignatureUploadDTO
    {
        public string SignatureData { get; set; }
        public string SignatureKey { get; set; }
    }
}
