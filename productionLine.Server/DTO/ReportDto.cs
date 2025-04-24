namespace productionLine.Server.DTO
{
    public class ReportDto
    {
        public int Id { get; set; }
        public int FormId { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string LayoutType { get; set; }
        public string DefinitionJson { get; set; }
        public List<ReportAccessDto> AccessList { get; set; }
    }
}
