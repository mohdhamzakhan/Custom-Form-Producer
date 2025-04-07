namespace productionLine.Server.DTO
{
    public class FormDto
    {
        public int Id { get; set; }
        public string FormLink { get; set; }
        public string Name { get; set; }
        public List<FieldDto> Fields { get; set; } = new();
    }

}
