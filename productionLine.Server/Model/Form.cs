using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace productionLine.Server.Model
{
    [Table("FF_FORM")]
    public class Form
    {
        [Key]
        [Column("ID")]
        public int Id { get; set; }

        [Required]
        [Column("NAME")]
        [JsonPropertyName("name")]
        public string Name { get; set; }

        [Required]
        [Column("FORMLINK")]
        [JsonPropertyName("formLink")]
        public string FormLink { get; set; }  // Unique link to access the form

        [Timestamp]
        [Column("ROWVERSION")]
        public byte[] RowVersion { get; set; }

        [Column("CREATEDBY")]
        public string? CreatedBy { get; set; }

        [Column("CREATEDAT")]
        public DateTime CreatedAt { get; set; }

        [NotMapped]
        [Required]
        public List<FormField> Fields { get; set; } = new List<FormField>();
        [JsonPropertyName("approvers")] // 👈 Important for JSON
        public List<FormApprover> Approvers { get; set; } = new List<FormApprover>(); // 👈 Important

        [Column("LINKED_FORM_ID")]
        public int? LinkedFormId { get; set; }

        [Column("KEY_FIELD_MAPPINGS", TypeName = "CLOB")]
        public string? KeyFieldMappingsJson { get; set; }

        [NotMapped]
        public List<KeyFieldMapping>? KeyFieldMappings
        {
            get => string.IsNullOrEmpty(KeyFieldMappingsJson) ? null : JsonSerializer.Deserialize<List<KeyFieldMapping>>(KeyFieldMappingsJson);
            set => KeyFieldMappingsJson = JsonSerializer.Serialize(value);
        }
    }
}
