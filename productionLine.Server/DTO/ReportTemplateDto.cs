public class ReportTemplateDto
{
    public int Id { get; set; }
    public int FormId { get; set; }
    public string Name { get; set; }
    public string CreatedBy { get; set; }
    public bool IncludeApprovals { get; set; }
    public bool IncludeRemarks { get; set; }
    public string? SharedWithRole { get; set; }

    public List<ReportFieldDto> Fields { get; set; }
    public List<ReportFilterDto> Filters { get; set; }
    public List<CalculatedField> CalculatedFields { get; set; }     // ✅ NEW
    public object? ChartConfig { get; set; }                         // ✅ NEW
}


public class ReportFieldDto
{
    public string FieldId { get; set; }           // ✅ New
    public string FieldLabel { get; set; }
    public int Order { get; set; }
}

public class ReportFilterDto
{
    public string FieldLabel { get; set; }
    public string Operator { get; set; }
    public string Value { get; set; }
    public string Type { get; set; }
}

public class CalculatedField
{
    public string Label { get; set; }
    public string Formula { get; set; }
    public string? Description { get; set; }
    public string? Format { get; set; }
    public int Precision { get; set; }
}

