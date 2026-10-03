using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace productionLine.Server.Model
{
    [Table("FF_AUDITPLAN")]
    public class AuditPlan
    {
        [Column("ID")]
        public int Id { get; set; }

        [Column("PLANNAME")]
        public string PlanName { get; set; } = "";

        [Column("DESCRIPTION")]
        public string? Description { get; set; }

        [Column("DURATIONTYPE")]
        public string DurationType { get; set; } = "Yearly";
        // Monthly/Quarterly/HalfYearly/Yearly/TwoYear/ThreeYear/Custom

        [Column("STARTDATE")]
        public DateTime StartDate { get; set; }

        [Column("ENDDATE")]
        public DateTime EndDate { get; set; }

        // Approver
        [Column("APPROVERADOBJECTID")]
        public string? ApproverAdObjectId { get; set; }

        [Column("APPROVERNAME")]
        public string? ApproverName { get; set; }

        [Column("APPROVEREMAIL")]
        public string? ApproverEmail { get; set; }

        // Draft → Pending → Approved/Rejected → Active → Completed
        [Column("STATUS")]
        public string Status { get; set; } = "Draft";

        [Column("CREATEDBY")]
        public string CreatedBy { get; set; } = "";

        [Column("UPDATEDBY")]
        public string? UpdatedBy { get; set; }

        [Column("APPROVEDBY")]
        public string? ApprovedBy { get; set; }

        [Column("APPROVALCOMMENTS")]
        public string? ApprovalComments { get; set; }

        [Column("CREATEDAT")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [Column("UPDATEDAT")]
        public DateTime? UpdatedAt { get; set; }

        [Column("APPROVEDAT")]
        public DateTime? ApprovedAt { get; set; }


        [JsonIgnore]
        public ICollection<AuditPlanEntry> Entries { get; set; }
            = new List<AuditPlanEntry>();
    }


    [Table("FF_AUDITPLANENTRY")]
    public class AuditPlanEntry
    {
        [Column("ID")]
        public int Id { get; set; }

        [ForeignKey("AuditPlan")]
        [Column("AUDITPLANID")]
        public int AuditPlanId { get; set; }

        [Column("TITLE")]
        public string Title { get; set; } = "";

        [Column("AUDITTYPE")]
        public string AuditType { get; set; } = "Process";
        // Process/Product/System/Compliance/Internal/Supplier

        [Column("DEPARTMENT")]
        public string? Department { get; set; }

        [Column("SCOPE")]
        public string? Scope { get; set; }


        // ---------------------------------------------------------
        // BACKWARD COMPATIBILITY
        // ---------------------------------------------------------
        // These fields can remain for old records/reports.
        // New assignments should use Participants.

        [Column("AUDITORID")]
        public string? AuditorId { get; set; }

        [Column("AUDITORNAME")]
        public string AuditorName { get; set; } = "";

        [Column("AUDITOREMAIL")]
        public string? AuditorEmail { get; set; }

        [Column("AUDITEEID")]
        public string? AuditeeId { get; set; }

        [Column("AUDITEENAME")]
        public string AuditeeName { get; set; } = "";

        [Column("AUDITEEEMAIL")]
        public string? AuditeeEmail { get; set; }


        // ---------------------------------------------------------
        // SCHEDULING
        // ---------------------------------------------------------

        [Column("SCHEDULEDDATE")]
        public DateTime ScheduledDate { get; set; }

        [Column("FREQUENCY")]
        public string Frequency { get; set; } = "Once";
        // Once/Monthly/Quarterly/HalfYearly/Yearly

        [Column("REMINDERDAYSBEFORE")]
        public int ReminderDaysBefore { get; set; } = 3;


        // ---------------------------------------------------------
        // LIFECYCLE
        // ---------------------------------------------------------

        [Column("STATUS")]
        public string Status { get; set; } = "Scheduled";
        // Scheduled/InProgress/Completed/Skipped/Overdue

        [Column("COMPLETEDAT")]
        public DateTime? CompletedAt { get; set; }

        [Column("COMPLETIONREMARKS")]
        public string? CompletionRemarks { get; set; }

        [Column("CLOSEDBY")]
        public string? ClosedBy { get; set; }


        // ---------------------------------------------------------
        // BACKWARD COMPATIBILITY
        // ---------------------------------------------------------
        // These are no longer the source of truth for scheduling.
        // Notification.HangfireJobId should be used instead.

        [Column("HANGFIREJOBID")]
        public string? HangfireJobId { get; set; }

        [Column("REMINDERJOBID")]
        public string? ReminderJobId { get; set; }


        // ---------------------------------------------------------
        // RELATIONSHIPS
        // ---------------------------------------------------------

        [JsonIgnore]
        public AuditPlan? AuditPlan { get; set; }

        // Multiple auditors / auditees
        public ICollection<AuditPlanEntryPerson> Participants { get; set; }
            = new List<AuditPlanEntryPerson>();

        // Multiple notification stages
        public ICollection<AuditPlanEntryNotification> Notifications { get; set; }
            = new List<AuditPlanEntryNotification>();
    }


    // =============================================================
    // AUDIT PLAN ENTRY PERSON
    // =============================================================
    // Supports:
    //   - Multiple auditors
    //   - Multiple auditees
    //   - AD users
    //   - AD groups
    //
    // ROLE       = Auditor / Auditee
    // PERSONTYPE = user / group
    // =============================================================

    [Table("FF_AUDITPLANENTRYPERSON")]
    public class AuditPlanEntryPerson
    {
        [Column("ID")]
        public int Id { get; set; }

        [ForeignKey("AuditPlanEntry")]
        [Column("AUDITPLANENTRYID")]
        public int AuditPlanEntryId { get; set; }

        [Column("ROLE")]
        public string Role { get; set; } = "";
        // Auditor / Auditee

        [Column("PERSONID")]
        public string PersonId { get; set; } = "";
        // AD Object ID / SID

        [Column("PERSONTYPE")]
        public string PersonType { get; set; } = "user";
        // user / group

        [Column("PERSONNAME")]
        public string PersonName { get; set; } = "";

        [Column("PERSONEMAIL")]
        public string? PersonEmail { get; set; }


        [JsonIgnore]
        public AuditPlanEntry? AuditPlanEntry { get; set; }
    }


    // =============================================================
    // AUDIT PLAN ENTRY NOTIFICATION
    // =============================================================
    // One record per notification stage.
    //
    // Intimation
    // Reminder7Days
    // Reminder1Day
    // Overdue7Days
    // =============================================================

    [Table("FF_AUDITPLANENTRYNOTIFICATION")]
    public class AuditPlanEntryNotification
    {
        [Column("ID")]
        public int Id { get; set; }

        [ForeignKey("AuditPlanEntry")]
        [Column("AUDITPLANENTRYID")]
        public int AuditPlanEntryId { get; set; }

        [Column("REMINDERTYPE")]
        public string ReminderType { get; set; } = "";
        // Intimation / Reminder7Days / Reminder1Day / Overdue7Days

        [Column("SCHEDULEDFOR")]
        public DateTime ScheduledFor { get; set; }

        [Column("SENTAT")]
        public DateTime? SentAt { get; set; }

        [Column("STATUS")]
        public string Status { get; set; } = "Scheduled";
        // Scheduled / Sent / Cancelled / Failed

        [Column("HANGFIREJOBID")]
        public string? HangfireJobId { get; set; }


        [JsonIgnore]
        public AuditPlanEntry? AuditPlanEntry { get; set; }
    }
}