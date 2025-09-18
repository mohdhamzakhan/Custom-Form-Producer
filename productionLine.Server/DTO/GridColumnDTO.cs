using System.Text.Json.Serialization;

namespace productionLine.Server.DTO
{
    public class GridColumnDto
    {
        public string Id { get; set; }

        public string Name { get; set; }


        public string Type { get; set; }

        public string Width { get; set; }

        public List<string>? Options { get; set; }


        public double? Min { get; set; }


        public double? Max { get; set; }


        public bool? Decimal { get; set; }

        public string? Formula { get; set; }

        public string? textColor { get; set; }

        public string? backgroundColor { get; set; }

        public string? ParentColumn { get; set; }
        public Dictionary<string, List<string>>? DependentOptions { get; set; }
        public string? StartTime { get; set; }
        public string? EndTime { get; set; }
        public bool? Required { get; set; }
        public List<string>? RemarksOptions { get; set; }
        public int? LinkedFormId { get; set; }
        public Guid? LinkedFieldId { get; set; }
        public string? LinkedFieldType { get; set; }
        public Guid? LinkedGridFieldId { get; set; }
        public string? LinkedColumnId { get; set; }
        public string? DisplayMode { get; set; }
        public string? DisplayFormat { get; set; }
        public bool? AllowManualEntry { get; set; }
        public bool? ShowLookupButton { get; set; }
        public string? KeyFieldMappingsJson { get; set; }
    }
}
