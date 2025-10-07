using productionLine.Server.Model;

namespace productionLine.Server.DTO
{
    public class FormDto
    {
        public int Id { get; set; }
        public string FormLink { get; set; }
        public string Name { get; set; }
        public int? LinkedFormId { get; set; }
        public List<KeyFieldMapping>? KeyFieldMappings { get; set; }
        public List<FieldDto> Fields { get; set; } = new();
        public List<ApproverDto> Approvers { get; set; }
        public List<ApproverDto> allowedUsers { get; set; }
    }

    public class ApproverDto
    {
        public int Id { get; set; }
        public string AdObjectId { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string Type { get; set; }
        public int Level { get; set; }
    }


}
