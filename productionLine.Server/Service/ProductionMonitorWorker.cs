using Microsoft.EntityFrameworkCore;
using productionLine.Server.Model;
using System.Text.Json;

namespace productionLine.Server.Services
{
    public class ProductionMonitorWorker : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<ProductionMonitorWorker> _logger;

        // Anti-spam dictionary to remember when we last alerted someone for a line
        private readonly Dictionary<string, DateTime> _lastAlertSent = new();

        public ProductionMonitorWorker(IServiceScopeFactory scopeFactory, ILogger<ProductionMonitorWorker> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Production Monitor Worker started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessLineStatusesAsync(stoppingToken);
                    _logger.LogInformation("Started the background Service");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred during background monitoring.");
                }

                // Wait 1 minute before checking again
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }

        private async Task ProcessLineStatusesAsync(CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FormDbContext>();

            // 1. Fetch Global Configs
            var shifts = await db.ShiftConfigs.AsNoTracking().ToListAsync(cancellationToken);
            var quietHours = await db.QuietHoursConfigs.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
            var recipients = await db.RecipientConfigs.AsNoTracking().Where(r => r.Enabled).ToListAsync(cancellationToken);
             var lines = await db.LineConfigs.AsNoTracking().ToListAsync(cancellationToken);

            // 2. Check Global Suppression (Breaks & Quiet Hours)
            var (inBreak, breakName) = CheckBreak(shifts);
            bool inQuietHours = CheckQuietHours(quietHours);
            bool isSuppressedGlobally = (inBreak && quietHours?.SkipBreaks == true) || inQuietHours;
            string suppressReason = inQuietHours ? "QuietHours" : (inBreak ? breakName : null);

            var currentShiftKey = CurrentShiftKey(shifts);

            foreach (var line in lines)
            {
                // 3. Get the Last Submission Age for this Line
                // Replace this with your actual logic/query to get the last submission time from your dynamic forms tables
                DateTime? lastSubmissionTime = await GetLastSubmissionTimeAsync(db, line.FormId);

                if (!lastSubmissionTime.HasValue) continue;

                var ageMinutes = (DateTime.Now - lastSubmissionTime.Value).TotalMinutes;

                // 4. Identify the "Respected Persons" (Personnel currently on duty for this line)
                var onDutyEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                var activeEngineers = line.Engineers.Where(e => string.IsNullOrEmpty(e.Shift) || e.Shift == currentShiftKey);
                var activeSupervisors = line.Supervisors.Where(s => string.IsNullOrEmpty(s.Shift) || s.Shift == currentShiftKey);

                foreach (var p in activeEngineers.Concat(activeSupervisors).Where(p => !string.IsNullOrWhiteSpace(p.Email)))
                {
                    onDutyEmails.Add(p.Email);
                }

                // 5. Evaluate Recipients mapped to this line
                foreach (var recipient in recipients)
                {
                    // Check if recipient wants alerts for this line, AND if they are the on-duty person (by email match)
                    bool mappedToLine = !recipient.LineIds.Any() || recipient.LineIds.Contains(line.FormId.ToString());

                    if (!mappedToLine) continue;

                    // 6. Check if line is DOWN based on THIS recipient's delay threshold
                    if (ageMinutes >= recipient.DelayMin)
                    {
                        string alertKey = $"{line.Id}_{recipient.Id}";

                        // Prevent spam: Only send once every 30 minutes per incident
                        if (_lastAlertSent.TryGetValue(alertKey, out DateTime lastSent) && (DateTime.Now - lastSent).TotalMinutes < 30)
                        {
                            continue;
                        }

                        var logEntry = new NotificationLog
                        {
                            LineId = line.Id.ToString(),
                            LinePlant = line.Plant,
                            RecipientId = recipient.Id,
                            RecipientName = recipient.Name,
                            Platform = recipient.Android && recipient.Ios ? "Both" : (recipient.Android ? "Android" : "iOS"),
                            SentAt = DateTime.Now
                        };

                        if (isSuppressedGlobally)
                        {
                            logEntry.Status = "Suppressed";
                            logEntry.SuppressReason = suppressReason;
                        }
                        else
                        {
                            // 🚀 FIRE THE PUSH NOTIFICATION
                            bool success = await SendPushNotificationAsync(recipient, line.Plant, ageMinutes);

                            logEntry.Status = success ? "Sent" : "Failed";
                            if (!success) logEntry.ErrorMsg = "FCM/APNs Gateway rejected the push.";

                            // Mark as alerted
                            _lastAlertSent[alertKey] = DateTime.Now;
                        }

                        db.NotificationLogs.Add(logEntry);
                    }
                }
            }

            await db.SaveChangesAsync(cancellationToken);
        }

        // --- Utility Methods ---

        private async Task<DateTime?> GetLastSubmissionTimeAsync(FormDbContext db, string formId)
        {
            // TODO: Write your EF query here that checks your specific form submission table 
            // e.g., return await db.Submissions.Where(s => s.FormId == formId).MaxAsync(s => s.SubmittedAt);
            return DateTime.Now.AddMinutes(-10); // Mocked for demonstration
        }



        private async Task<bool> SendPushNotificationAsync(RecipientConfig recipient, string plantName, double downMinutes)
        {
            if (string.IsNullOrWhiteSpace(recipient.DeviceTokensJson) || recipient.DeviceTokens.Count == 0)
                return false;

            string title = $"🚨 Line Down: {plantName}";
            string body = $"No data received for {Math.Round(downMinutes)} minutes.";

            try
            {
                // TODO: Integrate FirebaseAdmin (FCM) or Apple Push here.
                // foreach (var token in recipient.DeviceTokens) { FirebaseMessaging.DefaultInstance.SendAsync(...) }
                _logger.LogInformation($"Sending Push to {recipient.Name}: {title} - {body}");
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        // Duplicated from your controller for background use
        private string CurrentShiftKey(List<ShiftConfig> shifts)
        {
            var now = DateTime.Now.Hour * 60 + DateTime.Now.Minute;
            return shifts.FirstOrDefault(s => IsTimeInRange(now, TimeToMinutes(s.Start), TimeToMinutes(s.End)))?.Key ?? "";
        }

        private (bool, string?) CheckBreak(List<ShiftConfig> shifts)
        {
            var now = DateTime.Now.Hour * 60 + DateTime.Now.Minute;
            foreach (var s in shifts)
                foreach (var b in s.Breaks)
                    if (IsTimeInRange(now, TimeToMinutes(b.Start), TimeToMinutes(b.End)))
                        return (true, b.Name);
            return (false, null);
        }

        private bool CheckQuietHours(QuietHoursConfig? qh)
        {
            if (qh?.Enabled != true || string.IsNullOrWhiteSpace(qh.Start) || string.IsNullOrWhiteSpace(qh.End)) return false;
            var now = DateTime.Now.Hour * 60 + DateTime.Now.Minute;
            return IsTimeInRange(now, TimeToMinutes(qh.Start), TimeToMinutes(qh.End));
        }

        private int TimeToMinutes(string t)
        {
            if (string.IsNullOrWhiteSpace(t)) return 0;
            var parts = t.Split(':');
            return parts.Length < 2 ? 0 : int.Parse(parts[0]) * 60 + int.Parse(parts[1]);
        }

        private bool IsTimeInRange(int nowMin, int startMin, int endMin) =>
            startMin <= endMin ? nowMin >= startMin && nowMin < endMin : nowMin >= startMin || nowMin < endMin;
    }
}