using System.ComponentModel.DataAnnotations;

namespace productionLine.Server.DTO.AuditPlan
{
    // ── Inbound DTOs ──────────────────────────────────────────────
    public class PersonDto
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public string? Email { get; set; }
    }

    public class AuditEntryCreateDto
    {
        [Required] public string Title { get; set; } = "";
        [Required] public string AuditType { get; set; } = "Process";
        public string? Department { get; set; }
        public string? Scope { get; set; }
        [Required] public string AuditorId { get; set; } = "";
        [Required] public string AuditorName { get; set; } = "";
        public string? AuditorEmail { get; set; }
        [Required] public string AuditeeId { get; set; } = "";
        [Required] public string AuditeeName { get; set; } = "";
        public string? AuditeeEmail { get; set; }
        [Required] public DateTime ScheduledDate { get; set; }
        public string Frequency { get; set; } = "Once";
        public int ReminderDaysBefore { get; set; } = 3;

        // From frontend PersonPicker objects (mapped on controller)
        public PersonDto? Auditor { get; set; }
        public PersonDto? Auditee { get; set; }
    }

    public class AuditPlanCreateDto
    {
        [Required, MaxLength(200)] public string PlanName { get; set; } = "";
        public string? Description { get; set; }
        [Required] public string DurationType { get; set; } = "Yearly";
        [Required] public DateTime StartDate { get; set; }
        [Required] public DateTime EndDate { get; set; }
        [Required] public PersonDto Approver { get; set; } = new();
        public bool SubmitForApproval { get; set; } = false;
        public List<AuditEntryCreateDto> Entries { get; set; } = new();
        public string userName { get; set; } = "system";
    }

    public class ApprovalDto
    {
        public bool Approved { get; set; }
        public string? Comments { get; set; }
    }

    // ── Outbound DTOs ─────────────────────────────────────────────
    public class AuditPlanListDto
    {
        public int Id { get; set; }
        public string PlanName { get; set; } = "";
        public string? Description { get; set; }
        public string DurationType { get; set; } = "";
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Status { get; set; } = "";
        public string? ApproverName { get; set; }
        // Returned in list so the client can filter plans by the logged-in user
        public string? ApproverEmail { get; set; }
        public string? ApproverAdObjectId { get; set; }
        public int TotalAudits { get; set; }
        public int CompletedAudits { get; set; }
        public DateTime CreatedAt { get; set; }
        public string CreatedBy { get; set; } = "";
    }

    public class AuditPlanDetailDto : AuditPlanListDto
    {
        public PersonDto? Approver { get; set; }
        public string? ApprovalComments { get; set; }
        public string? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public List<AuditPlanEntryDto> Entries { get; set; } = new();
    }

    public class AuditPlanEntryDto
    {
        public int Id { get; set; }
        public int AuditPlanId { get; set; }
        public string Title { get; set; } = "";
        public string AuditType { get; set; } = "";
        public string? Department { get; set; }
        public string? Scope { get; set; }
        public string? AuditorId { get; set; }
        public string AuditorName { get; set; } = "";
        public string? AuditorEmail { get; set; }
        public string? AuditeeId { get; set; }
        public string AuditeeName { get; set; } = "";
        public string? AuditeeEmail { get; set; }
        public DateTime ScheduledDate { get; set; }
        public string Frequency { get; set; } = "Once";
        public int ReminderDaysBefore { get; set; }
        public string Status { get; set; } = "";
        public DateTime? CompletedAt { get; set; }
        public string? HangfireJobId { get; set; }
        public string? ReminderJobId { get; set; }
    }
}
