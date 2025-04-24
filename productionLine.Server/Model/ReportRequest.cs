namespace productionLine.Server.Model
{
    public class ReportRequest
    {
        public int FormId { get; set; }
        public List<string> SelectedFields { get; set; }
        public Dictionary<string, string>? Filters { get; set; } // FieldName -> Value/Condition
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public bool IncludeApprovals { get; set; }
        public bool IncludeRemarks { get; set; }
    }

}
