namespace productionLine.Server.Model
{
    public class ReportTemplate
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int FormId { get; set; }
        public string CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }

        public List<ReportField> Fields { get; set; } = new();
        public List<ReportFilter> Filters { get; set; } = new();

        public bool IncludeApprovals { get; set; }
        public bool IncludeRemarks { get; set; }

        public string? SharedWithRole { get; set; }  // Optional
    }

    public class ReportField
    {
        public int Id { get; set; }
        public string FieldLabel { get; set; }
        public int Order { get; set; }
    }

    public class ReportFilter
    {
        public int Id { get; set; }
        public string FieldLabel { get; set; }
        public string Operator { get; set; }  // e.g., ">", "<", "=", "contains"
        public string Value { get; set; }
    }

}
