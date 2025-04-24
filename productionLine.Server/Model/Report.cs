using System.ComponentModel.DataAnnotations.Schema;

namespace productionLine.Server.Model
{
    [Table("FF_REPORT")]
    public class Report
    {
        [Column("ID")]
        public int Id { get; set; }
        [Column("FORMID")]
        public int FormId { get; set; }
        [Column("NAME")]
        public string Name { get; set; }
        [Column("DESCRIPTION")]
        public string Description { get; set; }
        [Column("LAYOUTTYPE")]
        public string LayoutType { get; set; } // "list", "single", "grouped", etc.
        [Column("DEFINITIONJSON")]
        public string DefinitionJson { get; set; } // Stores fields, formulas, merge logic
        [Column("CREATEDBY")]
        public string CreatedBy { get; set; }
        [Column("CREATEDAT")]
        public DateTime CreatedAt { get; set; }
        [Column("UPDATEDAT")]
        public DateTime UpdatedAt { get; set; }

        public Form Form { get; set; }
        public ICollection<ReportAccess> AccessList { get; set; }
    }

}
