namespace productionLine.Server.Model
{
    public class ReportRow
    {
        public DateTime SubmittedAt { get; set; }
        public string SubmittedBy { get; set; }
        public Dictionary<string, string> Fields { get; set; } = new();
        public string? ApprovalStatus { get; set; }
        public string? ApproverName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? Remarks { get; set; }
    }

}
