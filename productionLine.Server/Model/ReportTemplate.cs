using System;
using System.Collections.Generic;
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

        // 🚀 Navigation collections (NOT [Column])
        public List<ReportField> Fields { get; set; } = new();
        public List<ReportFilter> Filters { get; set; } = new();

        [Column("INCLUDEAPPROVALS")]
        public bool IncludeApprovals { get; set; }

        [Column("INCLUDEREMARKS")]
        public bool IncludeRemarks { get; set; }

        [Column("SHAREDWITHROLE")]
        public string? SharedWithRole { get; set; }

        [Column("CALCULATEDFIELDS")]
        public string? CalculatedFields { get; set; }  // store JSON

        [Column("CHARTCONFIG")]
        public string? ChartConfig { get; set; }       // store JSON

        [Column("ISDELETE")]
        public bool IsDeleted { get; set; }

        [Column("DELETEDAT")]
        public DateTime? DeletedAt { get; set; }

        [Column("DELETEDBY")]
        public string? DeletedBy { get; set; }
    }

    [Table("FF_REPORTFIELD")]
    public class ReportField
    {
        [Column("ID")]
        public int Id { get; set; }

        [Column("TEMPLATEID")]
        public int ReportTemplateId { get; set; }  // FK to template

        public ReportTemplate ReportTemplate { get; set; }  // nav

        [Column("FIELDID")]
        public string FieldId { get; set; }

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

        [Column("TEMPLATEID")]
        public int ReportTemplateId { get; set; }  // FK to template

        public ReportTemplate ReportTemplate { get; set; }  // nav

        [Column("FIELDLABEL")]
        public string? FieldLabel { get; set; }

        [Column("OPERATOR")]
        public string? Operator { get; set; }

        [Column("VALUE")]
        public string? Value { get; set; }

        [Column("TYPE")]
        public string? Type { get; set; }
    }
}
