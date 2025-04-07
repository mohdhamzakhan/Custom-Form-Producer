using System.ComponentModel.DataAnnotations.Schema;

namespace productionLine.Server.Model
{
    [Table("FF_FORMAPPROVER")]
    public class FormApprover
    {
        [Column("ID")]
        public int Id { get; set; }
        [Column("ADOBJECTID")]
        public string AdObjectId { get; set; }
        [Column("NAME")]
        public string Name { get; set; }
        [Column("EMAIL")]
        public string Email { get; set; }
        [Column("TYPE")]
        public string Type { get; set; } // "user" or "group"
        [Column("LEVEL")]
        public int Level { get; set; }
        [Column("FORMID")]
        public int FormId { get; set; }
        public Form Form { get; set; }
    }
}
