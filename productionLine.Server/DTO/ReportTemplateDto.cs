namespace productionLine.Server.DTO
{
    public class ReportTemplateDto
    {
        public int FormId { get; set; }
        public string Name { get; set; }
        public string CreatedBy { get; set; } // optional if needed
        public bool IncludeApprovals { get; set; }
        public bool IncludeRemarks { get; set; }
        public string? SharedWithRole { get; set; }

        public List<ReportFieldDto> Fields { get; set; } = new();
        public List<ReportFilterDto> Filters { get; set; } = new();
    }

    public class ReportFieldDto
    {
        public string FieldLabel { get; set; }
        public int Order { get; set; }
    }

    public class ReportFilterDto
    {
        public string FieldLabel { get; set; }
        public string Operator { get; set; }
        public string Value { get; set; }
        public string Type { get; set; } // <-- add this!
    }

}
