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

        [Column("IMAGEOPTIONS", TypeName = "CLOB")]
        public string? IMAGEOPTIONS { get; set; }

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

        [Column("IMAGEVALUE")]
        public string? ImageValue { get; set; }
        [Column("LINKED_FORM_ID")]
        public int? LinkedFormId { get; set; }

        [Column("LINKED_FIELD_ID")]
        public Guid? LinkedFieldId { get; set; }

        [Column("LINKED_FIELD_TYPE")]
        public string? LinkedFieldType { get; set; } // "field" or "gridColumn"

        [Column("LINKED_GRID_FIELD_ID")]
        public Guid? LinkedGridFieldId { get; set; } // Parent grid field ID

        [Column("LINKED_COLUMN_ID")]
        public string? LinkedColumnId { get; set; } // Column ID within grid

        [Column("KEY_FIELD_MAPPINGS", TypeName = "CLOB")]
        public string? KeyFieldMappingsJson { get; set; }
        [Column("DISPLAY_MODE")]
        public string? DisplayMode { get; set; }

        [Column("DISPLAY_FORMAT")]
        public string? DisplayFormat { get; set; }

        [Column("ALLOW_MANUAL_ENTRY", TypeName = "NUMBER(1)")]
        public bool? AllowManualEntry { get; set; }

        [Column("SHOW_LOOKUP_BUTTON", TypeName = "NUMBER(1)")]
        public bool? ShowLookupButton { get; set; }

        [Column("MINLENGTH")]
        public int? minLength{get;set;}
        [Column("MAXLENGTH")]
        public int? maxLength { get;set;}
        [Column("MESSAGE")]
        public string? lengthValidationMessage { get;set;}

        [NotMapped]
        public List<KeyFieldMapping>? KeyFieldMappings
        {
            get => string.IsNullOrEmpty(KeyFieldMappingsJson) ? null : JsonSerializer.Deserialize<List<KeyFieldMapping>>(KeyFieldMappingsJson);
            set => KeyFieldMappingsJson = JsonSerializer.Serialize(value);
        }
    }

    public class KeyFieldMapping
    {
        [JsonPropertyName("currentFormField")]
        public string CurrentFormField { get; set; }

        [JsonPropertyName("linkedFormField")]
        public string LinkedFormField { get; set; }
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
        [JsonPropertyName("remarksOptions")]
        public List<string>? RemarksOptions { get; set; }

        public ICollection<RemarkTrigger> RemarkTriggers { get; set; } = new List<RemarkTrigger>();
        [JsonPropertyName("linkedFormId")]
        public int? LinkedFormId { get; set; }

        [JsonPropertyName("linkedFieldId")]
        public Guid? LinkedFieldId { get; set; }

        [JsonPropertyName("linkedFieldType")]
        public string? LinkedFieldType { get; set; }

        [JsonPropertyName("linkedGridFieldId")]
        public Guid? LinkedGridFieldId { get; set; }

        [JsonPropertyName("linkedColumnId")]
        public string? LinkedColumnId { get; set; }

        [JsonPropertyName("displayMode")]
        public string? DisplayMode { get; set; }

        [JsonPropertyName("displayFormat")]
        public string? DisplayFormat { get; set; }

        [JsonPropertyName("allowManualEntry")]
        public bool? AllowManualEntry { get; set; }

        [JsonPropertyName("showLookupButton")]
        public bool? ShowLookupButton { get; set; }

        [JsonPropertyName("keyFieldMappingsJson")]
        public string? KeyFieldMappingsJson { get; set; }
        [JsonPropertyName("labelText")]
        public string? labelText { get; set; }
        [JsonPropertyName("labelStyle")]
        public string? labelStyle { get; set; }
        [JsonPropertyName("textAlign")]
        public string? textAlign { get; set; }
        [JsonPropertyName("lengthValidationMessage")]
        public string? lengthValidationMessage { get; set; }
        [JsonPropertyName("maxLength")]
        public int? maxLength { get; set; }
        [JsonPropertyName("minLength")]
        public int? minLength { get; set; }

        [NotMapped]
        [JsonPropertyName("keyFieldMappings")]
        public List<KeyFieldMapping>? KeyFieldMappings
        {
            get => string.IsNullOrEmpty(KeyFieldMappingsJson) ? null : JsonSerializer.Deserialize<List<KeyFieldMapping>>(KeyFieldMappingsJson);
            set => KeyFieldMappingsJson = JsonSerializer.Serialize(value);
        }

    }
}
