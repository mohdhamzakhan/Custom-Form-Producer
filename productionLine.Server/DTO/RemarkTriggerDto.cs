namespace productionLine.Server.DTO
{
    public class RemarkTriggerDto
    {
        public int Id { get; set; }
        public string Operator { get; set; }
        public double Value { get; set; }

        public Guid FormFieldId { get; set; }  // ✅ foreign key
        public string FormField { get; set; }  // ❗ placeholder? navigation property misconfigured?
    }

}
