using System.ComponentModel.DataAnnotations.Schema;

namespace productionLine.Server.Model
{
    [Table("FF_REPORTTEMPLATE")]
    public class ReportTemplate
    {
        [Column("ID")]
        public int Id { get; set; }
        [Column("NAME")]
        public string Name { get; set; }
        [Column("FORMID")]
        public int FormId { get; set; }
        [Column("CREATEDBY")]
        public string CreatedBy { get; set; }
        [Column("CREATEDAT")]
        public DateTime CreatedAt { get; set; }
        [Column("FIELDS")]
        public List<ReportField> Fields { get; set; } = new();
        [Column("FILTERS")]
        public List<ReportFilter> Filters { get; set; } = new();
        [Column("INCLUDEAPPROVALS")]
        public bool IncludeApprovals { get; set; }
        [Column("INCLUDEREMARKS")]
        public bool IncludeRemarks { get; set; }
        [Column("SHAREDWITHROLE")]
        public string? SharedWithRole { get; set; }  // Optional
    }
    [Table("FF_REPORTFIELD")]
    public class ReportField
    {
        [Column("ID")]
        public int Id { get; set; }
        [Column("FIELDLABEL")]
        public string? FieldLabel { get; set; }
        [Column("ORDER")]
        public int Order { get; set; }
    }
    [Table("FF_REPORTFILTER")]
    public class ReportFilter
    {
        [Column("ID")]
        public int Id { get; set; }
        [Column("FIELDLABEL")]
        public string? FieldLabel { get; set; }
        [Column("OPERATOR")]
        public string? Operator { get; set; }  // e.g., ">", "<", "=", "contains"
        [Column("VALUE")]
        public string? Value { get; set; }
        [Column("TYPE")]
        public string? Type { get; set; }
    }

}
