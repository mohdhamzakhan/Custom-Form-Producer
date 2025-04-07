using System.ComponentModel.DataAnnotations.Schema;

namespace productionLine.Server.Model
{
    [Table("FF_FORMRESPONSE")]
    public class FormResponse
    {
        [Column("ID")]
        public int Id { get; set; }
        [Column("FORMID")]
        public int FormId { get; set; }
        [Column("FORM")]
        public Form Form { get; set; }
        [Column("SUBMITTEDAT")]
        public DateTime SubmittedAt { get; set; } = DateTime.Now;
        public List<FormResponseField> Fields { get; set; } = new();
    }

}
