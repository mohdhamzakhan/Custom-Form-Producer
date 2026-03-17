// DTO/PartialSubmissionDto.cs
namespace productionLine.Server.DTO
{
    public class CreatePartialSubmissionDto
    {
        public int FormId { get; set; }
        public string AssignedToEmail { get; set; }
        public string? AssignedToName { get; set; }
        public string? FilledBy { get; set; }

        // Key = fieldId, Value = field value (stringified)
        public Dictionary<string, string> FilledData { get; set; } = new();

        // List of field IDs that were filled and should be locked
        public List<string> FilledFieldIds { get; set; } = new();
    }

    public class CompletePartialSubmissionDto
    {
        public string Token { get; set; }

        // The remaining fields filled by the second person
        public Dictionary<string, string> RemainingData { get; set; } = new();
    }

    public class PartialSubmissionStatusDto
    {
        public long Id { get; set; }
        public long FormId { get; set; }
        public string Token { get; set; }
        public string AssignedToEmail { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public Dictionary<string, string> FilledData { get; set; }
        public List<string> FilledFieldIds { get; set; }
    }
}