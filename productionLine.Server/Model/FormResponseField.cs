using System.ComponentModel.DataAnnotations.Schema;

namespace productionLine.Server.Model
{
    [Table("FF_FORMRESPONSEFIELD")]
    public class FormResponseField
    {
        [Column("ID")]
        public int Id { get; set; }
        [Column("FORMRESPONSEID")]
        public int FormResponseId { get; set; }
        [Column("FORMRESPONSE")]
        public FormResponse FormResponse { get; set; }
        [Column("FIELDLABEL")]
        public string FieldLabel { get; set; }
        [Column("FIELDVALUE")]
        public string FieldValue { get; set; }
    }
}
