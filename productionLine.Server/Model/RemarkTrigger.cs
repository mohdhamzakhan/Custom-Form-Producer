using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace productionLine.Server.Model
{
    [Table("FF_REMARK_TRIGGER")]
    public class RemarkTrigger
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [Column("OPERATOR")]
        public string Operator { get; set; }  // =, >, <, >=, <=

        [Required]
        [Column("VALUE")]
        public double Value { get; set; }

        [ForeignKey("FORMFIELDID")]
        [Column("FORMFIELDID")]
        public Guid FormFieldId { get; set; }
        public FormField FormField { get; set; }
    }
}
