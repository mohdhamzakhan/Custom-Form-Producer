using System.ComponentModel.DataAnnotations.Schema;

namespace productionLine.Server.Model
{
    [Table("FF_REPORT_ACCESS")]
    public class ReportAccess
    {
        [Column("ID")]
        public int Id { get; set; }
        [Column("REPORTID")]
        public int ReportId { get; set; }
        [Column("USERGROUPID")]
        public string UserOrGroupId { get; set; } // Either a user ID or AD group ID
        [Column("ACCESSTYPE")]
        public string AccessType { get; set; } // "view", "edit", etc.

        public Report Report { get; set; }
    }

}
