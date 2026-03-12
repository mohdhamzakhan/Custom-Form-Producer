using System.Net;
using System.Net.Mail;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using productionLine.Server.DTO.AuditPlan;
using productionLine.Server.Model;

namespace productionLine.Server.Service
{
    public class AuditPlanService : IAuditPlanService
    {
        // IServiceScopeFactory lets each Hangfire job execution get a fresh
        // DbContext scope, exactly how EmailSchedulerService does it.
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly SmtpSettings _smtp;
        private readonly ILogger<AuditPlanService> _log;

        public AuditPlanService(
            IServiceScopeFactory scopeFactory,
            IOptions<SmtpSettings> smtp,
            ILogger<AuditPlanService> log)
        {
            _scopeFactory = scopeFactory;
            _smtp = smtp.Value;
            _log = log;
        }

        // ── CREATE ───────────────────────────────────────────────────
        public async Task<AuditPlan> CreatePlanAsync(AuditPlanCreateDto dto, string createdBy)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FormDbContext>();

            var plan = new AuditPlan
            {
                PlanName = dto.PlanName,
                Description = dto.Description,
                DurationType = dto.DurationType,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                ApproverAdObjectId = dto.Approver.Id,
                ApproverName = dto.Approver.Name,
                ApproverEmail = dto.Approver.Email,
                Status = dto.SubmitForApproval ? "Pending" : "Draft",
                CreatedBy = createdBy,
                CreatedAt = DateTime.UtcNow,
                Entries = MapEntries(dto.Entries),
            };

            db.AuditPlans.Add(plan);
            await db.SaveChangesAsync();

            // Fire approval email immediately via Hangfire — non-blocking
            if (dto.SubmitForApproval && !string.IsNullOrEmpty(dto.Approver.Email))
            {
                BackgroundJob.Enqueue<AuditPlanService>(
                    svc => svc.SendApprovalRequestEmail(plan.Id, dto.Approver.Email!, createdBy));
            }

            return plan;
        }

        // ── UPDATE ───────────────────────────────────────────────────
        public async Task UpdatePlanAsync(AuditPlan existing, AuditPlanCreateDto dto, string updatedBy)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FormDbContext>();

            // Cancel orphaned Hangfire jobs from the old entries
            foreach (var old in existing.Entries)
                CancelEntryJobs(old);

            existing.PlanName = dto.PlanName;
            existing.Description = dto.Description;
            existing.DurationType = dto.DurationType;
            existing.StartDate = dto.StartDate;
            existing.EndDate = dto.EndDate;
            existing.ApproverAdObjectId = dto.Approver.Id;
            existing.ApproverName = dto.Approver.Name;
            existing.ApproverEmail = dto.Approver.Email;
            existing.UpdatedBy = updatedBy;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.Status = dto.SubmitForApproval ? "Pending" : "Draft";

            db.AuditPlanEntries.RemoveRange(existing.Entries);
            existing.Entries = MapEntries(dto.Entries);

            await db.SaveChangesAsync();

            if (dto.SubmitForApproval && !string.IsNullOrEmpty(dto.Approver.Email))
            {
                BackgroundJob.Enqueue<AuditPlanService>(
                    svc => svc.SendApprovalRequestEmail(existing.Id, dto.Approver.Email!, updatedBy));
            }
        }

        // ── DELETE ───────────────────────────────────────────────────
        public async Task DeletePlanAsync(int id)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FormDbContext>();

            var plan = await db.AuditPlans
                .Include(p => p.Entries)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (plan == null) return;

            foreach (var entry in plan.Entries)
                CancelEntryJobs(entry);

            db.AuditPlans.Remove(plan);
            await db.SaveChangesAsync();
        }

        // ── APPROVAL ─────────────────────────────────────────────────
        public async Task ProcessApprovalAsync(AuditPlan plan, bool approved, string approvedBy, string? comments = null)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FormDbContext>();

            // Re-attach to this scope's context so EF tracks changes
            db.AuditPlans.Attach(plan);

            plan.ApprovedBy = approvedBy;
            plan.ApprovedAt = DateTime.UtcNow;
            plan.Status = approved ? "Active" : "Rejected";
            plan.ApprovalComments = comments;

            if (approved)
            {
                foreach (var entry in plan.Entries)
                {
                    if (entry.Status == "Completed") continue;
                    ScheduleEntryJobs(entry);
                }
            }

            await db.SaveChangesAsync();
        }

        // ── MARK COMPLETE ────────────────────────────────────────────
        public async Task MarkEntryCompleteAsync(AuditPlanEntry entry)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FormDbContext>();

            // Cancel both the notification job and the reminder job
            CancelEntryJobs(entry);

            db.AuditPlanEntries.Attach(entry);
            entry.Status = "Completed";
            entry.CompletedAt = DateTime.UtcNow;
            entry.HangfireJobId = null;
            entry.ReminderJobId = null;

            await db.SaveChangesAsync();

            // If every entry in the plan is done → close the plan
            var allDone = await db.AuditPlanEntries
                .Where(e => e.AuditPlanId == entry.AuditPlanId)
                .AllAsync(e => e.Status == "Completed" || e.Status == "Skipped");

            if (allDone)
            {
                var plan = await db.AuditPlans.FindAsync(entry.AuditPlanId);
                if (plan != null)
                {
                    plan.Status = "Completed";
                    await db.SaveChangesAsync();
                }
            }
        }

        // ═════════════════════════════════════════════════════════════
        //  Job scheduling helpers
        // ═════════════════════════════════════════════════════════════

        private void ScheduleEntryJobs(AuditPlanEntry entry)
        {
            var sendAt = entry.ScheduledDate;
            var reminderAt = entry.ScheduledDate.AddDays(-entry.ReminderDaysBefore);

            // Main notification on the audit day
            if (sendAt > DateTime.UtcNow)
            {
                var delay = sendAt - DateTime.UtcNow;
                var jobId = BackgroundJob.Schedule<AuditPlanService>(
                    svc => svc.SendAuditNotificationEmail(entry.Id), delay);
                entry.HangfireJobId = jobId;
            }

            // Reminder N days before
            if (reminderAt > DateTime.UtcNow)
            {
                var delay = reminderAt - DateTime.UtcNow;
                var remId = BackgroundJob.Schedule<AuditPlanService>(
                    svc => svc.SendAuditReminderEmail(entry.Id), delay);
                entry.ReminderJobId = remId;
            }

            // Recurring audits → Hangfire recurring job
            if (entry.Frequency != "Once")
            {
                var cron = FrequencyToCron(entry.Frequency, entry.ScheduledDate);
                RecurringJob.AddOrUpdate<AuditPlanService>(
                    $"audit-entry-{entry.Id}",
                    svc => svc.SendAuditNotificationEmail(entry.Id),
                    cron);
            }
        }

        private static void CancelEntryJobs(AuditPlanEntry entry)
        {
            if (!string.IsNullOrEmpty(entry.HangfireJobId))
                BackgroundJob.Delete(entry.HangfireJobId);

            if (!string.IsNullOrEmpty(entry.ReminderJobId))
                BackgroundJob.Delete(entry.ReminderJobId);

            RecurringJob.RemoveIfExists($"audit-entry-{entry.Id}");
        }

        private static string FrequencyToCron(string frequency, DateTime anchor)
        {
            int day = Math.Min(anchor.Day, 28); // cap at 28 to avoid month-end issues
            int month = anchor.Month;
            int hour = anchor.Hour;
            int min = anchor.Minute;

            return frequency switch
            {
                "Monthly" => $"{min} {hour} {day} * *",
                "Quarterly" => $"{min} {hour} {day} */3 *",
                "HalfYearly" => $"{min} {hour} {day} */6 *",
                "Yearly" => $"{min} {hour} {day} {month} *",
                _ => Cron.Never()
            };
        }

        private static List<AuditPlanEntry> MapEntries(List<AuditEntryCreateDto> dtos) =>
            dtos.Select(e => new AuditPlanEntry
            {
                Title = e.Title,
                AuditType = e.AuditType,
                Department = e.Department,
                Scope = e.Scope,
                // Support both nested PersonDto (from frontend) and flat fields
                AuditorId = e.Auditor?.Id ?? e.AuditorId,
                AuditorName = e.Auditor?.Name ?? e.AuditorName,
                AuditorEmail = e.Auditor?.Email ?? e.AuditorEmail,
                AuditeeId = e.Auditee?.Id ?? e.AuditeeId,
                AuditeeName = e.Auditee?.Name ?? e.AuditeeName,
                AuditeeEmail = e.Auditee?.Email ?? e.AuditeeEmail,
                ScheduledDate = e.ScheduledDate,
                Frequency = e.Frequency,
                ReminderDaysBefore = e.ReminderDaysBefore,
                Status = "Scheduled",
            }).ToList();

        // ═════════════════════════════════════════════════════════════
        //  Hangfire job methods — must be public so Hangfire can
        //  serialize and invoke them. Each opens its own fresh scope.
        // ═════════════════════════════════════════════════════════════

        [AutomaticRetry(Attempts = 3)]
        public async Task SendAuditNotificationEmail(int entryId)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FormDbContext>();

            var entry = await db.AuditPlanEntries
                .Include(e => e.AuditPlan)
                .FirstOrDefaultAsync(e => e.Id == entryId);

            if (entry == null) return;

            // Guard: do not send if already marked complete
            if (entry.Status == "Completed" || entry.Status == "Skipped")
            {
                _log.LogInformation("Entry {Id} is {Status} — skipping email.", entryId, entry.Status);
                return;
            }

            var subject = $"[Audit] {entry.Title} – Scheduled for {entry.ScheduledDate:dd MMM yyyy}";
            var body = BuildAuditEmailBody(entry, isReminder: false);

            var recipients = new List<string>();
            if (!string.IsNullOrEmpty(entry.AuditorEmail)) recipients.Add(entry.AuditorEmail);
            if (!string.IsNullOrEmpty(entry.AuditeeEmail)) recipients.Add(entry.AuditeeEmail);

            foreach (var to in recipients.Distinct())
                await SendSmtpAsync(to, subject, body);

            _log.LogInformation("Audit notification sent for entry {Id} ({Title}) to {Count} recipient(s).",
                entryId, entry.Title, recipients.Distinct().Count());
        }

        [AutomaticRetry(Attempts = 3)]
        public async Task SendAuditReminderEmail(int entryId)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FormDbContext>();

            var entry = await db.AuditPlanEntries
                .Include(e => e.AuditPlan)
                .FirstOrDefaultAsync(e => e.Id == entryId);

            if (entry == null) return;
            if (entry.Status == "Completed" || entry.Status == "Skipped") return;

            var subject = $"[Reminder] {entry.Title} – in {entry.ReminderDaysBefore} day(s)";
            var body = BuildAuditEmailBody(entry, isReminder: true);

            var recipients = new List<string>();
            if (!string.IsNullOrEmpty(entry.AuditorEmail)) recipients.Add(entry.AuditorEmail);
            if (!string.IsNullOrEmpty(entry.AuditeeEmail)) recipients.Add(entry.AuditeeEmail);

            foreach (var to in recipients.Distinct())
                await SendSmtpAsync(to, subject, body);

            _log.LogInformation("Audit reminder sent for entry {Id} to {Count} recipient(s).",
                entryId, recipients.Distinct().Count());
        }

        [AutomaticRetry(Attempts = 3)]
        public async Task SendApprovalRequestEmail(int planId, string approverEmail, string requestedBy)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FormDbContext>();

            var plan = await db.AuditPlans.FindAsync(planId);
            if (plan == null) return;

            var subject = $"[Approval Required] Audit Plan: {plan.PlanName}";
            var body = $@"
<div style='font-family:sans-serif;font-size:14px;color:#1e293b;max-width:560px;'>
  <h2 style='color:#2563eb;'>Audit Plan Approval Request</h2>
  <p><strong>{requestedBy}</strong> has submitted the following audit plan for your approval:</p>
  <table style='border-collapse:collapse;width:100%;'>
    <tr><td style='padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0;width:140px;'>Plan Name</td>
        <td style='padding:8px 12px;border:1px solid #e2e8f0;'>{plan.PlanName}</td></tr>
    <tr><td style='padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0;'>Period</td>
        <td style='padding:8px 12px;border:1px solid #e2e8f0;'>{plan.StartDate:dd MMM yyyy} – {plan.EndDate:dd MMM yyyy}</td></tr>
    <tr><td style='padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0;'>Duration</td>
        <td style='padding:8px 12px;border:1px solid #e2e8f0;'>{plan.DurationType}</td></tr>
  </table>
  <p style='margin-top:16px;'>Please log in to review and approve or reject this plan.</p>
  <p style='color:#94a3b8;font-size:12px;margin-top:24px;'>
    This is an automated message from the Audit Planner system.
  </p>
</div>";

            await SendSmtpAsync(approverEmail, subject, body);
        }

        // ═════════════════════════════════════════════════════════════
        //  Core SMTP send — mirrors EmailSchedulerService.SendEmailAsync
        // ═════════════════════════════════════════════════════════════
        private async Task SendSmtpAsync(string toEmail, string subject, string htmlBody)
        {
            if (string.IsNullOrWhiteSpace(_smtp.Host) || string.IsNullOrWhiteSpace(_smtp.FromEmail))
            {
                _log.LogError("SMTP not configured. Cannot send email to {To}.", toEmail);
                return;
            }

            using var client = new SmtpClient(_smtp.Host, _smtp.Port)
            {
                EnableSsl = _smtp.EnableSsl,
                Credentials = new NetworkCredential(_smtp.Username, _smtp.Password),
                Timeout = 30_000,
            };

            using var msg = new MailMessage
            {
                From = new MailAddress(_smtp.FromEmail, _smtp.FromName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true,
            };
            msg.To.Add(toEmail);

            _log.LogInformation("Sending audit email to {To} | Subject: {Subject}", toEmail, subject);
            await client.SendMailAsync(msg);
        }

        // ═════════════════════════════════════════════════════════════
        //  Email body builder
        // ═════════════════════════════════════════════════════════════
        private static string BuildAuditEmailBody(AuditPlanEntry entry, bool isReminder)
        {
            var heading = isReminder
                ? $"Reminder: Upcoming Audit in {entry.ReminderDaysBefore} Day(s)"
                : "Audit Notification";

            var scopeRow = string.IsNullOrEmpty(entry.Scope) ? "" :
                $"<tr><td style='padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0;'>Scope</td>" +
                $"<td style='padding:8px 12px;border:1px solid #e2e8f0;'>{entry.Scope}</td></tr>";

            return $@"
<div style='font-family:sans-serif;font-size:14px;color:#1e293b;max-width:560px;'>
  <h2 style='color:#2563eb;margin-bottom:4px;'>{heading}</h2>
  <p style='color:#64748b;margin-top:0;'>{entry.Title}</p>
  <table style='border-collapse:collapse;width:100%;margin-top:16px;'>
    <tr><td style='padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0;width:140px;'>Audit Type</td>
        <td style='padding:8px 12px;border:1px solid #e2e8f0;'>{entry.AuditType}</td></tr>
    <tr><td style='padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0;'>Scheduled Date</td>
        <td style='padding:8px 12px;border:1px solid #e2e8f0;'>{entry.ScheduledDate:dddd, dd MMMM yyyy}</td></tr>
    <tr><td style='padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0;'>Department</td>
        <td style='padding:8px 12px;border:1px solid #e2e8f0;'>{entry.Department ?? "—"}</td></tr>
    <tr><td style='padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0;'>Auditor</td>
        <td style='padding:8px 12px;border:1px solid #e2e8f0;'>{entry.AuditorName}</td></tr>
    <tr><td style='padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0;'>Auditee</td>
        <td style='padding:8px 12px;border:1px solid #e2e8f0;'>{entry.AuditeeName}</td></tr>
    {scopeRow}
  </table>
  <p style='margin-top:20px;color:#64748b;font-size:12px;'>
    Automated notification from the Audit Planner. If this audit is already complete,
    please mark it done in the system to stop future reminders.
  </p>
</div>";
        }
    }
}
