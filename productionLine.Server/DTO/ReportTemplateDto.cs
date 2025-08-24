using System.Text.Json.Serialization;

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
    public List<ChartConfig>? ChartConfigs { get; set; } // ✅ strongly typed                        // ✅ NEW
}

public class ChartConfig
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("type")]
    public string Type { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("xField")]
    public string? XField { get; set; }

    [JsonPropertyName("metrics")]
    public List<string> Metrics { get; set; } = new List<string>();
    [JsonPropertyName("position")]
    public PositionDto? Position { get; set; }
    [JsonPropertyName("comboConfig")]
    public ComboConfigDto? ComboConfig { get; set; }
}

public class PositionDto
{
    public int Row { get; set; }
    public int Col { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
}

public class ComboConfigDto
{
    public List<string> BarMetrics { get; set; } = new List<string>();
    public List<string> LineMetrics { get; set; } = new List<string>();
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
    public int? Precision { get; set; }
    public string chartLabel { get; set; }
    public string scope { get; set; } // "row" or "column"
}
//public class CalculatedField
//{
//    public string calculationType { get; set; }
//    public string description { get; set; }
//    public string? format { get; set; }
//    public string? formula { get; set; }
//    public int? Precision { get; set; }
//    public string functionType { get; set; }
//    public string label { get; set; } // "row" or "column"
//    public string[] sourceFields { get; set; } // "row" or "column"
//}

