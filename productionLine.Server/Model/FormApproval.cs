using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace productionLine.Server.Model
{
    [Table("FF_FORMAPPROVAL")]
    public class FormApproval
    {
        [Column("ID")]
        public long Id { get; set; }

        [Column("FORMSUBMISSIONID")]
        public long FormSubmissionId { get; set; }

        [Column("FORMSUBMISSION")]
        [JsonIgnore]
        public FormSubmission FormSubmission { get; set; }  // Navigation to Submission

        [Column("APPROVERID")]
        public int ApproverId { get; set; }

        [Column("APPROVERNAME")]
        public string ApproverName { get; set; }

        [Column("APPROVALLEVEL")]
        public int ApprovalLevel { get; set; }  // Optional: for multi-level approvals

        [Column("APPROVALAT")]
        public DateTime? ApprovedAt { get; set; }

        [Column("COMMENTS")]
        public string? Comments { get; set; }

        [Column("STATUS")]
        public string Status { get; set; }  // Approved / Rejected
    }
}
