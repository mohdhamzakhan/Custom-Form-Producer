namespace productionLine.Server.DTO
{
    public class ApprovalActionDto
    {
        public int ApproverId { get; set; }
        public string ApproverName { get; set; }
        public int Level { get; set; }
        public string Comments { get; set; }
        public string Status { get; set; } // "Approved" or "Rejected"
    }
}
