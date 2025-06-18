using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Configuration;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace productionLine.Server.Model
{
    [Table("FF_FORMFIELD")]
    public class FormField
    {
        [Key]
        [Column("ID")]
        public Guid Id { get; set; }

        [Required]
        [Column("TYPE")]
        public string Type { get; set; }  // textbox, dropdown, numeric, etc.

        [Required]
        [Column("LABEL")]
        public string Label { get; set; }

        [Column("REQUIRED", TypeName = "NUMBER(1)")]
        public bool Required { get; set; }

        [Column("WIDTH")]
        public string Width { get; set; }

        // OPTIONS (dropdown, checkbox, radio)
        [Column("OPTIONS", TypeName = "CLOB")]
        public string? OptionsJson { get; set; }

        [NotMapped]
        public List<string>? Options
        {
            get => string.IsNullOrEmpty(OptionsJson) ? null : JsonSerializer.Deserialize<List<string>>(OptionsJson);
            set => OptionsJson = JsonSerializer.Serialize(value);
        }

        // REQUIRE REMARKS (specific dropdown options)
        [Column("REQUIRES_REMARKS", TypeName = "CLOB")]
        public string? RequiresRemarksJson { get; set; }
        [Column("ORDER")]
        public int Order { get; set; }

        [NotMapped]
        public List<string>? RequiresRemarks
        {
            get => string.IsNullOrEmpty(RequiresRemarksJson) ? null : JsonSerializer.Deserialize<List<string>>(RequiresRemarksJson);
            set => RequiresRemarksJson = JsonSerializer.Serialize(value);
        }

        // NUMERIC-SPECIFIC FIELDS
        [Column("MIN")]
        public double? Min { get; set; }

        [Column("MAX")]
        public double? Max { get; set; }

        [Column("DECIMAL", TypeName = "NUMBER(1)")]
        public bool? Decimal { get; set; }

        [Column("REMARKS_OUT", TypeName = "NUMBER(1)")]
        public bool? RequireRemarksOutOfRange { get; set; }

        // TRIGGER-BASED REMARKS FOR NUMERIC FIELDS
        [Column("REMARK_TRIGGERS", TypeName = "CLOB")]
        public string? RemarkTriggersJson { get; set; }

        [NotMapped]
        public List<RemarkTrigger>? RemarkTriggers
        {
            get => string.IsNullOrEmpty(RemarkTriggersJson) ? null : JsonSerializer.Deserialize<List<RemarkTrigger>>(RemarkTriggersJson);
            set => RemarkTriggersJson = JsonSerializer.Serialize(value);
        }

        // FORM ASSOCIATION
        [Column("FORMID")]
        public int FormId { get; set; }

        [ForeignKey(nameof(FormId))]
        public Form Form { get; set; }

        // CALCULATION FIELDS
        [Column("FORMULA", TypeName = "CLOB")]
        public string? Formula { get; set; }

        [Column("RESULT_DECIMAL", TypeName = "NUMBER(1)")]
        public bool? ResultDecimal { get; set; }

        [Column("FIELD_REFERENCES", TypeName = "CLOB")]
        public string? FieldReferencesJson { get; set; }

        [NotMapped]
        public List<string>? FieldReferences
        {
            get => string.IsNullOrEmpty(FieldReferencesJson) ? null : JsonSerializer.Deserialize<List<string>>(FieldReferencesJson);
            set => FieldReferencesJson = JsonSerializer.Serialize(value);
        }

        // GRID CONFIG
        [Column("COLUMNS", TypeName = "CLOB")]
        public string? ColumnsJson { get; set; }

        [NotMapped]
        public List<GridColumn>? Columns
        {
            get => string.IsNullOrEmpty(ColumnsJson) ? null : JsonSerializer.Deserialize<List<GridColumn>>(ColumnsJson);
            set => ColumnsJson = JsonSerializer.Serialize(value);
        }

        [Column("MIN_ROWS")]
        public int? MinRows { get; set; }

        [Column("MAX_ROWS")]
        public int? MaxRows { get; set; }

        [Column("INITIAL_ROWS")]
        public int? InitialRows { get; set; }
    }


    public class GridColumn
    {
        [JsonPropertyName("id")]
        [Key]
        public string Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; }

        [JsonPropertyName("type")]
        public string Type { get; set; }

        [JsonPropertyName("width")]
        public string Width { get; set; }

        [JsonPropertyName("options")]
        public List<string>? Options { get; set; }

        [JsonPropertyName("min")]
        public double? Min { get; set; }

        [JsonPropertyName("max")]
        public double? Max { get; set; }

        [JsonPropertyName("decimal")]
        public bool? Decimal { get; set; }

        [JsonPropertyName("formula")]
        public string? Formula { get; set; }
        [JsonPropertyName("textColor")]
        public string? textColor { get; set; }

        [JsonPropertyName("backgroundColor")]
        public string? backgroundColor { get; set; }

        [JsonPropertyName("parentColumn")]
        public string? ParentColumn { get; set; }
        [JsonPropertyName("dependentOptions")]
        public Dictionary<string, List<string>>? DependentOptions { get; set; }
        [JsonPropertyName("startTime")]
        public string? StartTime { get; set; }
        [JsonPropertyName("endTime")]
        public string? EndTime { get; set; }
        [JsonPropertyName("required")]
        public bool? Required { get; set; }

        public ICollection<RemarkTrigger> RemarkTriggers { get; set; } = new List<RemarkTrigger>();
    }
}
