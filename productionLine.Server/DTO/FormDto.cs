namespace productionLine.Server.DTO
{
    public class FormDto
    {
        public int Id { get; set; }
        public string FormLink { get; set; }
        public string Name { get; set; }
        public List<FieldDto> Fields { get; set; } = new();
        public List<ApproverDto> Approvers { get; set; } // 👈 Add this
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
