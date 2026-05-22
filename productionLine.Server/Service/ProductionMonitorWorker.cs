using Appwrite;
using Appwrite.Services;
using Microsoft.EntityFrameworkCore;
using productionLine.Server.Model;
using System.Text.Json;

namespace productionLine.Server.Services
{
    public class ProductionMonitorWorker : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<ProductionMonitorWorker> _logger;
        private readonly Dictionary<string, DateTime> _lastAlertSent = new();

        // Appwrite Services
        private readonly Client _appwriteClient;
        private readonly Users _appwriteUsers;
        private readonly Messaging _appwriteMessaging;
        private readonly Databases _appwriteDatabases;
        private readonly TablesDB _tablesDB;



        // Configuration - Replace with your actual Appwrite details
        private const string AppwriteEndpoint = "https://fra.cloud.appwrite.io/v1";
        private const string AppwriteProjectId = "69fad71700047614a4fe";
        private const string AppwriteApiKey = "standard_941048efcab14c1972acbb5fee8053601c035956d9e3290b83a8db986559203ee0b72d740a254dba24ea13d21caef3f01cec5e11c120383097a9209ec644dcd6bfd248ed5f4b62064c18333dafbf9ea306895d35ea406bc4ef5dd32eef72b8c211fa0493dcd9e02d006c4365b8e561af715655b28cf55766d197c4205bd7e3d1"; // Needs users.read, messages.write, documents.write
        private const string AppwriteDatabaseId = "69fad726001482a22c65";
        private const string AppwriteCollectionId = "notification_logs";

        public ProductionMonitorWorker(IServiceScopeFactory scopeFactory, ILogger<ProductionMonitorWorker> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;

            _appwriteClient = new Client()
                .SetEndpoint(AppwriteEndpoint)
                .SetProject(AppwriteProjectId)
                .SetKey(AppwriteApiKey);

            _appwriteUsers = new Users(_appwriteClient);
            _appwriteMessaging = new Messaging(_appwriteClient);
            _appwriteDatabases = new Databases(_appwriteClient);
            _tablesDB = new TablesDB(_appwriteClient);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Appwrite Production Monitor Worker started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessLineStatusesAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred during background monitoring.");
                }

                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }

        private async Task ProcessLineStatusesAsync(CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FormDbContext>();

            var shifts = await db.ShiftConfigs.AsNoTracking().ToListAsync(cancellationToken);
            var quietHours = await db.QuietHoursConfigs.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
            var recipients = await db.RecipientConfigs.AsNoTracking().Where(r => r.Enabled).ToListAsync(cancellationToken);
            var lines = await db.LineConfigs.AsNoTracking().ToListAsync(cancellationToken);

            var (inBreak, breakName) = CheckBreak(shifts);
            bool inQuietHours = CheckQuietHours(quietHours);
            bool isSuppressedGlobally = (inBreak && quietHours?.SkipBreaks == true) || inQuietHours;
            string? suppressReason = inQuietHours ? "QuietHours" : (inBreak ? breakName : null);

            foreach (var line in lines)
            {
                // TODO: Replace with your actual database query to find the last form submission time
                DateTime? lastSubmissionTime = db.FormSubmissions.Where(f => f.FormId.ToString() == line.FormId).OrderByDescending(f => f.SubmittedAt).Select(f => (DateTime?)f.SubmittedAt).FirstOrDefault();

                //DateTime? lastSubmissionTime =  DateTime.Now.AddMinutes(-10); // Simulate a line that has been down for 10 minutes. Replace with actual query in production.
                if (!lastSubmissionTime.HasValue) continue;

                var ageMinutes = (DateTime.Now - lastSubmissionTime.Value).TotalMinutes;

                string supNames = string.Join(", ", line.Supervisors.Select(s => s.Name));
                string supEmails = string.Join(", ", line.Supervisors.Select(s => s.Email));
                string supPhones = string.Join(", ", line.Supervisors.Select(s => s.Phone));

                string engNames = string.Join(", ", line.Engineers.Select(e => e.Name));
                string engEmails = string.Join(", ", line.Engineers.Select(e => e.Email));
                string engPhones = string.Join(", ", line.Engineers.Select(e => e.Phone));

                foreach (var recipient in recipients)
                {
                    // Check if this recipient is mapped to this line using FormId
                    bool mappedToLine = recipient.LineIds == null || !recipient.LineIds.Any() || recipient.LineIds.Contains(line.FormId);

                    if (!mappedToLine) continue;

                    if (ageMinutes >= recipient.DelayMin)
                    {
                        string alertKey = $"{line.Id}_{recipient.Id}";

                        // Cooldown filter: Don't spam notifications
                        if (_lastAlertSent.TryGetValue(alertKey, out DateTime lastSent) && (DateTime.Now - lastSent).TotalMinutes < 30)
                            continue;

                        string status = "Sent";
                        string errorMsg = "";

                        if (isSuppressedGlobally)
                        {
                            status = "Suppressed";
                        }
                        else
                        {
                            // 1. Send Push via Appwrite Native Messaging
                            try
                            {
                                string? appwriteUserId = await GetAppwriteUserIdByEmailAsync(recipient.Email);

                                if (appwriteUserId != null)
                                {
                                    await _appwriteMessaging.CreatePush(
                                        messageId: ID.Unique(),
                                        title: $"🚨 Line Down: {line.Plant}",
                                        body: $"No data received for {Math.Round(ageMinutes)} minutes.",
                                        users: new List<string> { appwriteUserId }
                                    );

                                    _lastAlertSent[alertKey] = DateTime.Now;
                                }
                                else
                                {
                                    status = "Failed";
                                    errorMsg = "User email not found in Appwrite Auth.";
                                }
                            }
                            catch (Exception ex)
                            {
                                status = "Failed";
                                errorMsg = $"Appwrite Push Error: {ex.Message}";
                                _logger.LogError($"Push failed for {recipient.Name}: {ex.Message}");
                            }
                        }

                        // 2. Dual-Logging Phase

                        // A. Log to Local Oracle Database
                        try
                        {
                            var localLogEntry = new NotificationLog
                            {
                                LineId = line.Id.ToString(),
                                LinePlant = line.Plant,
                                RecipientId = recipient.Id,
                                RecipientName = recipient.Name,
                                Platform = "Appwrite Native",
                                Status = status,
                                SuppressReason = suppressReason,
                                ErrorMsg = errorMsg,
                                SentAt = DateTime.Now
                            };

                            db.NotificationLogs.Add(localLogEntry);
                            await db.SaveChangesAsync(cancellationToken);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError($"Failed to write to local Oracle DB: {ex.Message}");
                        }

                        // B. Log to Cloud Appwrite Database
                        await LogToAppwriteDatabaseAsync(
                            lineId: line.Id.ToString(),
                            plantName: line.Plant,
                            recipientName: recipient.Name,
                            recipientEmail: recipient.Email,
                            platform: "Appwrite Native",
                            status: status,
                            suppressReason: suppressReason,
                            errorMsg: errorMsg,
                            supervisorName: supNames,
                            supervisorEmail: supEmails,
                            supervisorPhone: supPhones,
                            engineerName: engNames,
                            engineerEmail: engEmails,
                            engineerPhone: engPhones
                        );
                    }
                }
            }
        }

        // --- Appwrite Helper Methods ---

        private async Task<string?> GetAppwriteUserIdByEmailAsync(string? email)
        {
            if (string.IsNullOrWhiteSpace(email)) return null;

            try
            {
                var result = await _appwriteUsers.List(queries: new List<string> { Query.Equal("email", email) });
                if (result.Total > 0)
                {
                    return result.Users[0].Id;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to lookup user by email {email}: {ex.Message}");
            }
            return null;
        }

        private async Task LogToAppwriteDatabaseAsync(string lineId, string plantName, string recipientName, string recipientEmail, string platform, string status, string? suppressReason, string? errorMsg, string? supervisorName, string? supervisorEmail, string? supervisorPhone, string? engineerName, string? engineerEmail, string? engineerPhone)
        {
            try
            {
                var logData = new Dictionary<string, object>
                {
                    { "lineId", lineId },
                    { "linePlant", plantName ?? "Unknown" },
                    { "recipientName", recipientName ?? "Unknown" },
                    { "recipientEmail", recipientEmail ?? "No Email" },
                    { "platform", platform },
                    { "status", status },
                    { "sentAt", DateTime.Now.ToString("o") },
                    { "supervisorName", supervisorName ?? "N/A" },
                    { "supervisorEmail", supervisorEmail ?? "N/A" },
                    { "supervisorPhone", supervisorPhone ?? "N/A" },
                    { "engineerName", engineerName ?? "N/A" },
                    { "engineerEmail", engineerEmail ?? "N/A" },
                    { "engineerPhone", engineerPhone ?? "N/A" }

                };

                if (!string.IsNullOrEmpty(suppressReason)) logData.Add("suppressReason", suppressReason);
                if (!string.IsNullOrEmpty(errorMsg)) logData.Add("errorMsg", errorMsg);

                await _tablesDB.CreateRow(
                    databaseId: AppwriteDatabaseId,
                    tableId: AppwriteCollectionId,
                    rowId: ID.Unique(),
                    data: logData
                );
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to write log to Appwrite DB: {ex.Message}");
            }
        }

        // --- Time & Suppression Helpers ---
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