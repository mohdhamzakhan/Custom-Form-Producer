namespace productionLine.Server.Model
{
    public class AuditPlan
    {
        public int Id { get; set; }
        public string PlanName { get; set; } = "";
        public string? Description { get; set; }
        public string DurationType { get; set; } = "Yearly"; // Monthly/Quarterly/HalfYearly/Yearly/TwoYear/ThreeYear/Custom
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        // Approver (from AD)
        public string? ApproverAdObjectId { get; set; }
        public string? ApproverName { get; set; }
        public string? ApproverEmail { get; set; }

        // Workflow status: Draft → Pending → Approved/Rejected → Active → Completed
        public string Status { get; set; } = "Draft";
        public string CreatedBy { get; set; } = "";
        public string? UpdatedBy { get; set; }
        public string? ApprovedBy { get; set; }
        public string? ApprovalComments { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }

        public ICollection<AuditPlanEntry> Entries { get; set; } = new List<AuditPlanEntry>();
    }

    public class AuditPlanEntry
    {
        public int Id { get; set; }
        public int AuditPlanId { get; set; }

        public string Title { get; set; } = "";
        public string AuditType { get; set; } = "Process"; // Process/Product/System/Compliance/Internal/Supplier
        public string? Department { get; set; }
        public string? Scope { get; set; }

        // Auditor (from AD)
        public string? AuditorId { get; set; }
        public string AuditorName { get; set; } = "";
        public string? AuditorEmail { get; set; }

        // Auditee (from AD)
        public string? AuditeeId { get; set; }
        public string AuditeeName { get; set; } = "";
        public string? AuditeeEmail { get; set; }

        public DateTime ScheduledDate { get; set; }
        public string Frequency { get; set; } = "Once"; // Once/Monthly/Quarterly/HalfYearly/Yearly
        public int ReminderDaysBefore { get; set; } = 3;

        // Lifecycle: Scheduled → InProgress → Completed / Skipped / Overdue
        public string Status { get; set; } = "Scheduled";
        public DateTime? CompletedAt { get; set; }

        // Hangfire job references (so we can cancel them when marked complete)
        public string? HangfireJobId { get; set; }
        public string? ReminderJobId { get; set; }

        public AuditPlan? AuditPlan { get; set; }
    }
}
