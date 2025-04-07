using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System;

namespace productionLine.Server.Model
{
    [Table("FF_FORMFIELD")]
    public class FormField
    {
        [Column("ID")]
        [Key]
        public Guid Id { get; set; }

        [Required]
        [Column("TYPE")]
        public string Type { get; set; }  // textbox, dropdown, numeric, checkbox

        [Required]
        [Column("LABEL")]
        public string Label { get; set; }

        [Column("REQUIRED", TypeName = "NUMBER(1)")]
        public bool Required { get; set; }

        [Column("WIDTH")]
        public string Width { get; set; }  // w-full, w-1/2, etc.

        [Column("OPTIONS")]
        public List<string>? Options { get; set; }  // Only for dropdowns & checkboxes

        [Column("REQUIRES_REMARKS")]
        public List<string>? RequiresRemarks { get; set; }  // Only for dropdowns & checkboxes

        // For numeric fields
        [Column("MIN")]
        public double? Min { get; set; }

        [Column("MAX")]
        public double? Max { get; set; }

        [Column("DECIMAL", TypeName = "NUMBER(1)")]
        public bool? Decimal { get; set; }

        [Column("REMARKS_OUT", TypeName = "NUMBER(1)")]
        public bool? RequireRemarksOutOfRange { get; set; }

        [Column("REMARK_TRIGGERS")]
        public List<RemarkTrigger>? RemarkTriggers { get; set; }  // For numeric fields

        [ForeignKey("FORMID")]
        [Column("FORMID")]
        public int FormId { get; set; }
        public Form Form { get; set; }
    }

   
}
