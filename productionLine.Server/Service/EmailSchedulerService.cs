using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Text.Json;
using System.Threading.Tasks;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using productionLine.Server.Model;

namespace productionLine.Server.Service
{
    public class SmtpSettings
    {
        public string Host { get; set; }
        public int Port { get; set; } = 25;
        public string Username { get; set; }
        public string Password { get; set; }
        public string FromEmail { get; set; }
        public string FromName { get; set; } = "Email Scheduler";
        public bool EnableSsl { get; set; } = true;
    }

    public interface IEmailSchedulerService
    {
        Task<EmailSchedule> CreateScheduleAsync(EmailSchedule schedule);
        Task<EmailSchedule> UpdateScheduleAsync(EmailSchedule schedule);
        Task DeleteScheduleAsync(int scheduleId);
        Task SetStatusAsync(int scheduleId, string status, string updatedBy);
        Task<string> AddAttachmentAsync(int scheduleId, Stream fileStream, string fileName, string contentType);
        Task RemoveAttachmentAsync(int attachmentId);
        Task TriggerNowAsync(int scheduleId);

        // Called by Hangfire - must be public and on the interface
        [AutomaticRetry(Attempts = 0)] // no retry so you see failures immediately
        Task ExecuteScheduledSendAsync(int scheduleId);
    }

    public class EmailSchedulerService : IEmailSchedulerService
    {
        // ── Use IServiceScopeFactory instead of DbContext directly ────────
        // Hangfire resolves this service in its own scope; using the factory
        // lets us create a fresh scope per job execution safely.
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly SmtpSettings _smtp;
        private readonly ILogger<EmailSchedulerService> _logger;
        private readonly string _attachmentBasePath;

        public EmailSchedulerService(
            IServiceScopeFactory scopeFactory,
            IOptions<SmtpSettings> smtp,
            ILogger<EmailSchedulerService> logger,
            IConfiguration config)
        {
            _scopeFactory = scopeFactory;
            _smtp = smtp.Value;
            _logger = logger;
            _attachmentBasePath = config["EmailScheduler:AttachmentPath"] ?? "attachments/schedules";
            Directory.CreateDirectory(_attachmentBasePath);
        }

        // ── TRIGGER NOW (ad-hoc) ─────────────────────────────────────────
        public Task TriggerNowAsync(int scheduleId)
        {
            _logger.LogInformation("Queueing immediate send for schedule {Id}", scheduleId);

            // Fire-and-forget via Hangfire background queue
            BackgroundJob.Enqueue<IEmailSchedulerService>(
                svc => svc.ExecuteScheduledSendAsync(scheduleId));

            return Task.CompletedTask;
        }

        // ── EXECUTE SEND (invoked by Hangfire worker) ────────────────────
        public async Task ExecuteScheduledSendAsync(int scheduleId)
        {
            _logger.LogInformation("=== ExecuteScheduledSendAsync START — ScheduleId: {Id}", scheduleId);

            // Create a fresh DI scope — Hangfire jobs run outside the HTTP request scope
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FormDbContext>();
            var adService = scope.ServiceProvider.GetRequiredService<IAdDirectoryService>();

            // ── Load schedule ────────────────────────────────────────────
            var schedule = await db.EmailSchedules
                .Include(s => s.Recipients)
                .Include(s => s.Attachments)
                .FirstOrDefaultAsync(s => s.Id == scheduleId);

            if (schedule == null)
            {
                _logger.LogWarning("Schedule {Id} not found. Aborting.", scheduleId);
                return;
            }

            _logger.LogInformation("Schedule found: '{Title}', Status: {Status}, Recipients: {Count}",
                schedule.Title, schedule.Status, schedule.Recipients.Count);

            // Allow sending even if status is not Active when triggered manually (send-now)
            // For scheduled jobs, only send when Active
            // We detect manual trigger by checking if called directly vs from recurrence

            // ── Resolve recipients ───────────────────────────────────────
            var resolvedEmails = await ResolveRecipientsAsync(
                schedule.Recipients.ToList(), adService);

            _logger.LogInformation("Resolved {Count} recipient email(s): {Emails}",
                resolvedEmails.Count,
                string.Join(", ", resolvedEmails.Select(r => r.Email)));

            if (resolvedEmails.Count == 0)
            {
                _logger.LogWarning("No resolved recipients for schedule {Id}. Aborting.", scheduleId);
                await WriteLogAsync(db, scheduleId, "Failed", 0, 0, 0,
                    "No recipients could be resolved.");
                return;
            }

            // ── Validate SMTP settings ───────────────────────────────────
            _logger.LogInformation("SMTP — Host: {Host}, Port: {Port}, From: {From}, SSL: {Ssl}",
                _smtp.Host, _smtp.Port, _smtp.FromEmail, _smtp.EnableSsl);

            if (string.IsNullOrWhiteSpace(_smtp.Host) || string.IsNullOrWhiteSpace(_smtp.FromEmail))
            {
                _logger.LogError("SMTP settings are missing. Check appsettings.json SmtpSettings.");
                await WriteLogAsync(db, scheduleId, "Failed", resolvedEmails.Count, 0,
                    resolvedEmails.Count, "SMTP not configured.");
                return;
            }

            // ── Send ─────────────────────────────────────────────────────
            var log = new EmailScheduleLog
            {
                EmailScheduleId = scheduleId,
                SentAt = DateTime.UtcNow,
                RecipientsTotal = resolvedEmails.Count,
                RecipientsJson = JsonSerializer.Serialize(resolvedEmails)
            };

            try
            {
                await SendEmailAsync(schedule, resolvedEmails);

                log.Status = "Success";
                log.RecipientsSucceeded = resolvedEmails.Count;
                log.RecipientsFailed = 0;

                // Update schedule metadata
                schedule.LastSentAt = DateTime.UtcNow;
                schedule.TotalSentCount++;

                // Compute next run for recurring jobs
                var next = ComputeNextSend(schedule, DateTime.UtcNow);
                if (next.HasValue &&
                    (schedule.EndDateTime == null || next <= schedule.EndDateTime))
                {
                    schedule.NextSendAt = next;
                }
                else if (schedule.OccurrenceType.Equals("Once", StringComparison.OrdinalIgnoreCase))
                {
                    schedule.Status = "Completed";
                    schedule.NextSendAt = null;
                }

                _logger.LogInformation("Email sent successfully for schedule {Id}", scheduleId);
            }
            catch (SmtpException smtpEx)
            {
                _logger.LogError(smtpEx,
                    "SMTP error sending schedule {Id}: StatusCode={Code}, Message={Msg}",
                    scheduleId, smtpEx.StatusCode, smtpEx.Message);

                log.Status = "Failed";
                log.RecipientsFailed = resolvedEmails.Count;
                log.RecipientsSucceeded = 0;
                log.ErrorMessage = $"SMTP {smtpEx.StatusCode}: {smtpEx.Message}";
                throw; // re-throw so Hangfire marks job as failed
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error sending schedule {Id}: {Msg}",
                    scheduleId, ex.Message);

                log.Status = "Failed";
                log.RecipientsFailed = resolvedEmails.Count;
                log.RecipientsSucceeded = 0;
                log.ErrorMessage = ex.Message;
                throw; // re-throw so Hangfire marks job as failed
            }
            finally
            {
                // Always save the log + updated schedule
                db.EmailScheduleLogs.Add(log);
                await db.SaveChangesAsync();
                _logger.LogInformation("=== ExecuteScheduledSendAsync END — ScheduleId: {Id}, Status: {Status}",
                    scheduleId, log.Status);
            }
        }

        // ── SMTP SEND ────────────────────────────────────────────────────
        private async Task SendEmailAsync(
            EmailSchedule schedule,
            List<ResolvedRecipient> recipients)
        {
            using var client = new SmtpClient(_smtp.Host, _smtp.Port)
            {
                EnableSsl = _smtp.EnableSsl,
                Credentials = new NetworkCredential(_smtp.Username, _smtp.Password),
                Timeout = 30000 // 30 seconds
            };

            using var msg = new MailMessage
            {
                From = new MailAddress(_smtp.FromEmail, _smtp.FromName),
                Subject = schedule.Subject,
                Body = schedule.Body,
                IsBodyHtml = true
            };

            foreach (var r in recipients)
            {
                switch (r.RecipientType.ToLower())
                {
                    case "cc": msg.CC.Add(r.Email); break;
                    case "bcc": msg.Bcc.Add(r.Email); break;
                    default: msg.To.Add(r.Email); break;
                }
            }

            // Attach files
            var disposables = new List<Attachment>();
            foreach (var att in schedule.Attachments)
            {
                if (!File.Exists(att.FilePath))
                {
                    _logger.LogWarning("Attachment file not found, skipping: {Path}", att.FilePath);
                    continue;
                }
                var attachment = new Attachment(att.FilePath) { Name = att.FileName };
                msg.Attachments.Add(attachment);
                disposables.Add(attachment);
            }

            _logger.LogInformation("Sending email — To: {To}, Subject: {Subject}",
                string.Join(", ", msg.To.Select(a => a.Address)),
                msg.Subject);

            await client.SendMailAsync(msg);

            foreach (var d in disposables) d.Dispose();
        }

        // ── RECIPIENT RESOLUTION ─────────────────────────────────────────
        private async Task<List<ResolvedRecipient>> ResolveRecipientsAsync(
            List<EmailScheduleRecipient> recipients,
            IAdDirectoryService adService)
        {
            var result = new List<ResolvedRecipient>();

            foreach (var r in recipients)
            {
                if (r.Type == "user" && !string.IsNullOrWhiteSpace(r.Email))
                {
                    _logger.LogInformation("Adding user recipient: {Email}", r.Email);
                    result.Add(new ResolvedRecipient(r.Email, r.RecipientType));
                }
                else if (r.Type == "group" && !string.IsNullOrWhiteSpace(r.AdObjectId))
                {
                    _logger.LogInformation("Expanding group: {Name} ({Id})", r.Name, r.AdObjectId);
                    try
                    {
                        var members = await adService.GetGroupMembersAsync(r.AdObjectId);
                        _logger.LogInformation("Group '{Name}' expanded to {Count} member(s)", r.Name, members.Count);
                        result.AddRange(members
                            .Where(m => !string.IsNullOrWhiteSpace(m.Email))
                            .Select(m => new ResolvedRecipient(m.Email, r.RecipientType)));
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to expand group {Name}", r.Name);
                    }
                }
                else
                {
                    _logger.LogWarning("Skipping recipient '{Name}' — Type: {Type}, Email: '{Email}'",
                        r.Name, r.Type, r.Email);
                }
            }

            // Deduplicate by email (case-insensitive)
            return result
                .GroupBy(r => r.Email.ToLower())
                .Select(g => g.First())
                .ToList();
        }

        // ── HANGFIRE JOB REGISTRATION ────────────────────────────────────
        private void RegisterHangfireJob(EmailSchedule schedule)
        {
            var jobId = HangfireJobId(schedule.Id);

            switch (schedule.OccurrenceType.ToLower())
            {
                case "once":
                    var delay = schedule.StartDateTime - DateTime.UtcNow;
                    if (delay > TimeSpan.Zero)
                        BackgroundJob.Schedule<IEmailSchedulerService>(
                            s => s.ExecuteScheduledSendAsync(schedule.Id), delay);
                    break;

                case "daily":
                    var dailyCron = BuildCron(schedule.SendTime);
                    RecurringJob.AddOrUpdate<IEmailSchedulerService>(
                        jobId, s => s.ExecuteScheduledSendAsync(schedule.Id), dailyCron);
                    break;

                case "weekly":
                    var days = schedule.RecurrenceDays ?? "1";
                    var weeklyCron = BuildCron(schedule.SendTime, days);
                    RecurringJob.AddOrUpdate<IEmailSchedulerService>(
                        jobId, s => s.ExecuteScheduledSendAsync(schedule.Id), weeklyCron);
                    break;

                case "monthly":
                    var dom = schedule.RecurrenceDays ?? "1";
                    var monthlyCron = BuildCron(schedule.SendTime, dayOfMonth: dom);
                    RecurringJob.AddOrUpdate<IEmailSchedulerService>(
                        jobId, s => s.ExecuteScheduledSendAsync(schedule.Id), monthlyCron);
                    break;

                case "custom":
                    if (!string.IsNullOrWhiteSpace(schedule.CronExpression))
                        RecurringJob.AddOrUpdate<IEmailSchedulerService>(
                            jobId, s => s.ExecuteScheduledSendAsync(schedule.Id),
                            schedule.CronExpression);
                    break;
            }
        }

        private static string BuildCron(
            string? sendTime,
            string? weekDays = null,
            string? dayOfMonth = null)
        {
            var parts = (sendTime ?? "08:00").Split(':');
            var hour = parts[0];
            var minute = parts.Length > 1 ? parts[1] : "00";

            if (weekDays != null) return $"{minute} {hour} * * {weekDays}";
            if (dayOfMonth != null) return $"{minute} {hour} {dayOfMonth} * *";
            return $"{minute} {hour} * * *"; // daily
        }

        private void RemoveHangfireJob(int scheduleId) =>
            RecurringJob.RemoveIfExists(HangfireJobId(scheduleId));

        private static string HangfireJobId(int scheduleId) =>
            $"email-schedule-{scheduleId}";

        // ── NEXT SEND COMPUTATION ────────────────────────────────────────
        private DateTime? ComputeNextSend(EmailSchedule schedule, DateTime after)
        {
            return schedule.OccurrenceType.ToLower() switch
            {
                "once" => null,
                "daily" => NextTime(schedule.SendTime ?? "08:00", after, addDays: 1),
                "weekly" => NextWeeklyTime(schedule.RecurrenceDays ?? "1",
                                 schedule.SendTime ?? "08:00", after),
                "monthly" => NextMonthlyTime(schedule.RecurrenceDays ?? "1",
                                 schedule.SendTime ?? "08:00", after),
                _ => null
            };
        }

        private static DateTime NextTime(string sendTime, DateTime after, int addDays)
        {
            var parts = sendTime.Split(':');
            var dt = new DateTime(after.Year, after.Month, after.Day,
                int.Parse(parts[0]), int.Parse(parts[1]), 0, DateTimeKind.Utc);
            return dt > after ? dt : dt.AddDays(addDays);
        }

        private static DateTime NextWeeklyTime(string days, string sendTime, DateTime after)
        {
            var dayNums = days.Split(',').Select(int.Parse).ToList();
            for (int i = 1; i <= 8; i++)
            {
                var candidate = after.Date.AddDays(i);
                if (dayNums.Contains((int)candidate.DayOfWeek))
                {
                    var parts = sendTime.Split(':');
                    var dt = new DateTime(candidate.Year, candidate.Month, candidate.Day,
                        int.Parse(parts[0]), int.Parse(parts[1]), 0, DateTimeKind.Utc);
                    if (dt > after) return dt;
                }
            }
            return after.AddDays(7);
        }

        private static DateTime NextMonthlyTime(string days, string sendTime, DateTime after)
        {
            var day = int.Parse(days.Split(',').First());
            var parts = sendTime.Split(':');
            var thisM = new DateTime(after.Year, after.Month,
                Math.Min(day, DateTime.DaysInMonth(after.Year, after.Month)),
                int.Parse(parts[0]), int.Parse(parts[1]), 0, DateTimeKind.Utc);
            if (thisM > after) return thisM;
            var next = after.AddMonths(1);
            return new DateTime(next.Year, next.Month,
                Math.Min(day, DateTime.DaysInMonth(next.Year, next.Month)),
                int.Parse(parts[0]), int.Parse(parts[1]), 0, DateTimeKind.Utc);
        }

        // ── CRUD ─────────────────────────────────────────────────────────
        public async Task<EmailSchedule> CreateScheduleAsync(EmailSchedule schedule)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FormDbContext>();

            schedule.CreatedAt = DateTime.UtcNow;
            schedule.UpdatedAt = DateTime.UtcNow;
            schedule.Status = "Active";
            schedule.NextSendAt = ComputeNextSend(schedule, DateTime.UtcNow);

            db.EmailSchedules.Add(schedule);
            await db.SaveChangesAsync();
            RegisterHangfireJob(schedule);
            return schedule;
        }

        public async Task<EmailSchedule> UpdateScheduleAsync(EmailSchedule schedule)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FormDbContext>();

            schedule.UpdatedAt = DateTime.UtcNow;
            schedule.NextSendAt = ComputeNextSend(schedule, DateTime.UtcNow);

            db.EmailSchedules.Update(schedule);
            await db.SaveChangesAsync();

            RemoveHangfireJob(schedule.Id);
            if (schedule.Status == "Active") RegisterHangfireJob(schedule);
            return schedule;
        }

        public async Task DeleteScheduleAsync(int scheduleId)
        {
            RemoveHangfireJob(scheduleId);
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FormDbContext>();

            var schedule = await db.EmailSchedules.FindAsync(scheduleId);
            if (schedule == null) return;

            var attachments = await db.EmailScheduleAttachments
                .Where(a => a.EmailScheduleId == scheduleId).ToListAsync();
            foreach (var att in attachments)
                if (File.Exists(att.FilePath)) File.Delete(att.FilePath);

            db.EmailSchedules.Remove(schedule);
            await db.SaveChangesAsync();
        }

        public async Task SetStatusAsync(int scheduleId, string status, string updatedBy)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FormDbContext>();

            var schedule = await db.EmailSchedules.FindAsync(scheduleId)
                ?? throw new KeyNotFoundException($"Schedule {scheduleId} not found.");

            schedule.Status = status;
            schedule.UpdatedAt = DateTime.UtcNow;
            schedule.UpdatedBy = updatedBy;
            await db.SaveChangesAsync();

            RemoveHangfireJob(scheduleId);
            if (status == "Active") RegisterHangfireJob(schedule);
        }

        public async Task<string> AddAttachmentAsync(
            int scheduleId, Stream fileStream, string fileName, string contentType)
        {
            var dir = Path.Combine(_attachmentBasePath, scheduleId.ToString());
            Directory.CreateDirectory(dir);
            var safeName = $"{Guid.NewGuid()}_{Path.GetFileName(fileName)}";
            var fullPath = Path.Combine(dir, safeName);

            await using var fs = File.Create(fullPath);
            await fileStream.CopyToAsync(fs);

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FormDbContext>();

            db.EmailScheduleAttachments.Add(new EmailScheduleAttachment
            {
                EmailScheduleId = scheduleId,
                FileName = fileName,
                FilePath = fullPath,
                ContentType = contentType,
                FileSizeBytes = new FileInfo(fullPath).Length,
                UploadedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
            return fullPath;
        }

        public async Task RemoveAttachmentAsync(int attachmentId)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FormDbContext>();

            var att = await db.EmailScheduleAttachments.FindAsync(attachmentId);
            if (att == null) return;
            if (File.Exists(att.FilePath)) File.Delete(att.FilePath);
            db.EmailScheduleAttachments.Remove(att);
            await db.SaveChangesAsync();
        }

        // ── Helpers ──────────────────────────────────────────────────────
        private async Task WriteLogAsync(
            FormDbContext db, int scheduleId, string status,
            int total, int succeeded, int failed, string? error = null)
        {
            db.EmailScheduleLogs.Add(new EmailScheduleLog
            {
                EmailScheduleId = scheduleId,
                SentAt = DateTime.UtcNow,
                Status = status,
                RecipientsTotal = total,
                RecipientsSucceeded = succeeded,
                RecipientsFailed = failed,
                ErrorMessage = error
            });
            await db.SaveChangesAsync();
        }
    }

    public record ResolvedRecipient(string Email, string RecipientType);
}