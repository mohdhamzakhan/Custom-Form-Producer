namespace productionLine.Server.DTO
{
    public class PendingApprovalDTO
    {
    }
    public class PendingSubmissionDto
    {
        public int Id { get; set; }
        public DateTime SubmittedAt { get; set; }
        public string FormName { get; set; }

        public int FormId { get; set; }          // 👈 add this
        public string FormLink { get; set; }     // 👈 optional but useful

        public List<ApprovalDto> Approvals { get; set; }
    }

    public class ApprovalDto
    {
        public int ApprovalLevel { get; set; }
        public string ApproverName { get; set; }
        public string Status { get; set; }
    }
}
