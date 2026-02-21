using System.Text.Json.Serialization;

public class ReportTemplateDto
{
    public int Id { get; set; }
    public int FormId { get; set; }
    public List<int>? FormIds { get; set; }
    public bool IsMultiForm { get; set; } = false;
    public string Name { get; set; }
    public string CreatedBy { get; set; }
    public bool IncludeApprovals { get; set; }
    public bool IncludeRemarks { get; set; }
    public string? SharedWithRole { get; set; }
    public string? LayoutMode { get; set; }
    public List<ReportFieldDto> Fields { get; set; }
    public List<ReportFilterDto> Filters { get; set; }
    public List<CalculatedField> CalculatedFields { get; set; }     // ✅ NEW
    public List<ChartConfig>? ChartConfigs { get; set; } // ✅ strongly typed                        // ✅ NEW
    public List<GroupingConfig> GroupingConfig { get; set; }
    public List<FormRelationship>? FormRelationships { get; set; }
}


public class FormRelationship
{
    public long Id { get; set; }
    public int SourceFormId { get; set; }
    public string SourceFieldId { get; set; }
    public int TargetFormId { get; set; }
    public string TargetFieldId { get; set; }
    public string Type { get; set; } 
}


public class GroupingConfig
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("fieldId")]
    public Guid FieldId { get; set; }

    [JsonPropertyName("order")]
    public int Order { get; set; }

    [JsonPropertyName("sortDirection")]
    public string SortDirection { get; set; }

    [JsonPropertyName("showSubtotals")]
    public bool ShowSubtotals { get; set; }

    [JsonPropertyName("aggregations")]
    public List<AggregationConfig> Aggregations { get; set; } = new();
}

public class AggregationConfig
{
    [JsonPropertyName("valueKind")]
    public List<string> ValueKind { get; set; } = new();
    [JsonPropertyName("fieldId")]
    public string FieldId { get; set; }
    [JsonPropertyName("label")]
    public string Label { get; set; }
    [JsonPropertyName("function")]
    public string Function { get; set; }
}

public class ChartConfig
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("type")]
    public string Type { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("showChart")]
    public bool ShowChart { get; set; }

    [JsonPropertyName("xField")]
    public string? XField { get; set; }

    [JsonPropertyName("metrics")]
    public List<string> Metrics { get; set; } = new List<string>();
    [JsonPropertyName("position")]
    public PositionDto? Position { get; set; }
    [JsonPropertyName("comboConfig")]
    public ComboConfigDto? ComboConfig { get; set; }

    [JsonPropertyName("shiftConfigs")]
    public List<ShiftConfigDto>? ShiftConfigs { get; set; }



    // Keep for backward compatibility
    [JsonIgnore] // Don't serialize this anymore
    public ShiftConfigDto? ShiftConfig { get; set; }
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
    public bool? Visible { get; set; }
    public int? FormId { get; set; }
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
    public string calculationType { get; set; }
    public string? description { get; set; }
    public string? format { get; set; }
    public string formula { get; set; }
    public string functionType { get; set; }
    public string id { get; set; }
    public string label { get; set; }
    public int? precision { get; set; }
    public bool showOneRowPerGroup { get; set; }
    public string sortOrder { get; set; }
    public string[] sourceFields { get; set; } // "row" or "column"
    public int windowSize { get; set; }
}

public class ShiftConfigDto
{
    [JsonPropertyName("targetParts")]
    public int TargetParts { get; set; }

    [JsonPropertyName("cycleTimeSeconds")]
    public double CycleTimeSeconds { get; set; }

    [JsonPropertyName("shift")]
    public string Shift { get; set; } = string.Empty;

    [JsonPropertyName("startTime")]
    public string StartTime { get; set; } = string.Empty;

    [JsonPropertyName("endTime")]
    public string EndTime { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("breaks")]
    public List<ShiftBreak> Breaks { get; set; } = new List<ShiftBreak>();

    [JsonPropertyName("modelNumber")]
    public string ModelNumber { get; set; }
    [JsonPropertyName("message")]
    public string Message { get; set; }
}

public class ShiftBreak
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("startTime")]
    public string StartTime { get; set; } = string.Empty;

    [JsonPropertyName("endTime")]
    public string EndTime { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
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

