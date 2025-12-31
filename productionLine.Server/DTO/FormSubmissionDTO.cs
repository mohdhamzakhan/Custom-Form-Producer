namespace productionLine.Server.DTO
{
    public class FormSubmissionDTO
    {
        public int FormId { get; set; }
        public int? SubmissionId { get; set; }
        public string? SubmittedAt { get; set; }   // ✅ optional
        public List<FormSubmissionDataDTO> SubmissionData { get; set; } = new List<FormSubmissionDataDTO>();
    }
}
