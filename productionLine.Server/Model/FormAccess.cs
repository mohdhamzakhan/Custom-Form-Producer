using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace productionLine.Server.Model
{
    [Table("FF_FORMACCESS")]
    public class FormAccess
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



        [ForeignKey("Form")]
        [Column("FORMID")]
        public int FormId { get; set; }


        [JsonIgnore] // 👈 Ignore backward navigation
        public Form? Form { get; set; }
    }
}
