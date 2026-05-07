using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using ProductionLineApp.Models;

namespace ProductionLineApp.Services
{
    public class AppwriteService
    {
        private readonly HttpClient _httpClient;
        private readonly JsonSerializerOptions _jsonOptions;

        // ─── Replace these with your actual Appwrite config ───────────────────
        private const string Endpoint = "https://cloud.appwrite.io/v1";
        private const string ProjectId = "69fad71700047614a4fe";
        private const string DatabaseId = "69fad726001482a22c65";
        private const string CollectionId = "notification_logs";
        // ──────────────────────────────────────────────────────────────────────

        public AppwriteService()
        {
            // BaseAddress MUST end with trailing slash; relative paths must NOT start with /
            // otherwise HttpClient strips the /v1 segment entirely.
            _httpClient = new HttpClient
            {
                BaseAddress = new Uri(Endpoint.TrimEnd('/') + "/")
            };

            // Appwrite requires these two headers for all SDK calls
            _httpClient.DefaultRequestHeaders.Add("X-Appwrite-Project", ProjectId);
            _httpClient.DefaultRequestHeaders.Add("X-Appwrite-Response-Format", "1.4.0");

            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
            };
        }

        // ── Set session JWT after login (call from AuthService) ──────────────
        public void SetSessionJwt(string jwt)
        {
            if (_httpClient.DefaultRequestHeaders.Contains("X-Appwrite-JWT"))
                _httpClient.DefaultRequestHeaders.Remove("X-Appwrite-JWT");

            _httpClient.DefaultRequestHeaders.Add("X-Appwrite-JWT", jwt);
        }

        // ── Fetch paginated notification logs ────────────────────────────────
        public async Task<(List<NotificationLog> logs, int total)> GetNotificationLogsAsync(
            int limit = 25,
            int offset = 0,
            string? statusFilter = null,
            string? lineFilter = null,
            CancellationToken ct = default)
        {
            var queries = new List<string>
            {
                $"limit({limit})",
                $"offset({offset})",
                "orderDesc(\"sentAt\")"
            };

            if (!string.IsNullOrEmpty(statusFilter))
                queries.Add($"equal(\"status\",\"{statusFilter}\")");

            if (!string.IsNullOrEmpty(lineFilter))
                queries.Add($"equal(\"lineId\",\"{lineFilter}\")");

            var queryString = string.Join("&", queries.Select(q => $"queries[]={Uri.EscapeDataString(q)}"));
            var url = $"databases/{DatabaseId}/collections/{CollectionId}/documents?{queryString}";

            try
            {
                var response = await _httpClient.GetAsync(url, ct);
                response.EnsureSuccessStatusCode();

                var json = await response.Content.ReadAsStringAsync(ct);
                var raw = JsonDocument.Parse(json);

                var total = raw.RootElement.GetProperty("total").GetInt32();
                var docs = raw.RootElement.GetProperty("documents");

                var logs = new List<NotificationLog>();
                foreach (var doc in docs.EnumerateArray())
                    logs.Add(ParseDocument(doc));

                return (logs, total);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AppwriteService] GetLogs error: {ex.Message}");
                return (new List<NotificationLog>(), 0);
            }
        }

        // ── Fetch the 5 most-recent logs (for dashboard) ─────────────────────
        public async Task<List<NotificationLog>> GetRecentLogsAsync(int count = 5, CancellationToken ct = default)
        {
            var (logs, _) = await GetNotificationLogsAsync(limit: count, ct: ct);
            return logs;
        }

        // ── Dashboard aggregate stats ────────────────────────────────────────
        public async Task<DashboardStats> GetDashboardStatsAsync(CancellationToken ct = default)
        {
            // Fetch up to 200 docs so we can aggregate client-side
            var (logs, total) = await GetNotificationLogsAsync(limit: 200, ct: ct);

            return new DashboardStats
            {
                TotalAlerts = total,
                SentAlerts = logs.Count(l => l.Status == "Sent"),
                SuppressedAlerts = logs.Count(l => l.Status == "Suppressed"),
                FailedAlerts = logs.Count(l => l.Status == "Failed"),
                ActiveLines = logs.Select(l => l.LineId).Distinct().Count()
            };
        }

        // ── Per-line status summary ──────────────────────────────────────────
        public async Task<List<LineStatus>> GetLineStatusesAsync(CancellationToken ct = default)
        {
            var (logs, _) = await GetNotificationLogsAsync(limit: 200, ct: ct);

            return logs
                .GroupBy(l => l.LineId)
                .Select(g => new LineStatus
                {
                    LineId = g.Key,
                    PlantName = g.First().LinePlant,
                    LastStatus = g.OrderByDescending(l => l.SentAt).First().Status,
                    LastActivity = g.Max(l => (DateTime?)l.SentAt),
                    AlertCount = g.Count()
                })
                .OrderByDescending(ls => ls.LastActivity)
                .ToList();
        }

        // ── Auth: create email session ────────────────────────────────────────
        public async Task<string?> LoginAsync(string email, string password, CancellationToken ct = default)
        {
            // Appwrite 1.4+ endpoint: POST /account/sessions
            // Body fields must be exactly "email" and "password"
            var body = new { email, password };
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Post, "account/sessions")
                {
                    Content = JsonContent.Create(body)
                };
                // Appwrite requires Content-Type explicitly for session creation
                request.Content.Headers.ContentType =
                    new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");

                var resp = await _httpClient.SendAsync(request, ct);

                if (!resp.IsSuccessStatusCode)
                {
                    var err = await resp.Content.ReadAsStringAsync(ct);
                    Console.WriteLine($"[AppwriteService] Login failed {(int)resp.StatusCode}: {err}");
                    return null;
                }

                // Session created — now exchange it for a JWT
                return await CreateJwtAsync(ct);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AppwriteService] Login error: {ex.Message}");
                return null;
            }
        }

        private async Task<string?> CreateJwtAsync(CancellationToken ct)
        {
            try
            {
                var resp = await _httpClient.PostAsync("account/jwt", null, ct);
                if (!resp.IsSuccessStatusCode) return null;

                var json = await resp.Content.ReadAsStringAsync(ct);
                var doc = JsonDocument.Parse(json);
                return doc.RootElement.GetProperty("jwt").GetString();
            }
            catch { return null; }
        }

        // ── Map raw JSON doc → NotificationLog ──────────────────────────────
        private static NotificationLog ParseDocument(JsonElement doc)
        {
            string GetStr(string key, string fallback = "") =>
                doc.TryGetProperty(key, out var p) ? p.GetString() ?? fallback : fallback;

            DateTime GetDate(string key)
            {
                if (doc.TryGetProperty(key, out var p) &&
                    DateTime.TryParse(p.GetString(), out var dt))
                    return dt;
                return DateTime.Now;
            }

            return new NotificationLog
            {
                Id = GetStr("$id"),
                LineId = GetStr("lineId"),
                LinePlant = GetStr("linePlant"),
                RecipientName = GetStr("recipientName"),
                RecipientEmail = GetStr("recipientEmail"),
                Platform = GetStr("platform"),
                Status = GetStr("status"),
                SuppressReason = doc.TryGetProperty("suppressReason", out var sr) ? sr.GetString() : null,
                ErrorMsg = doc.TryGetProperty("errorMsg", out var em) ? em.GetString() : null,
                SentAt = GetDate("sentAt")
            };
        }
    }
}