using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using ProductionLineApp.Models;

namespace ProductionLineApp.Services
{
    public class AppwriteService
    {
        private readonly HttpClient _httpClient;       // User-scoped (Cookies + JWT)
        private readonly HttpClient _adminHttpClient;  // API-key/Public-scoped
        private readonly CookieContainer _cookieContainer;
        private readonly JsonSerializerOptions _jsonOptions;

        // ─── Appwrite Configuration ──────────────────────────────────────────
        private const string Endpoint = "https://cloud.appwrite.io/v1";
        private const string ProjectId = "69fad71700047614a4fe";
        private const string DatabaseId = "69fad726001482a22c65";
        private const string CollectionId = "notification_logs";
        private const string MenuCollectionId = "app_menus";
        // ──────────────────────────────────────────────────────────────────────

        public AppwriteService()
        {
            var baseUri = new Uri(Endpoint.TrimEnd('/') + "/");

            // 1. Setup User Client with Cookie Support
            // Required because Appwrite's CreateJwt depends on the 'a_session' cookie
            _cookieContainer = new CookieContainer();
            var handler = new HttpClientHandler
            {
                CookieContainer = _cookieContainer,
                UseCookies = true,
                AllowAutoRedirect = true,
            };

            _httpClient = new HttpClient(handler) { BaseAddress = baseUri };
            _httpClient.DefaultRequestHeaders.Add("X-Appwrite-Project", ProjectId);
            _httpClient.DefaultRequestHeaders.Add("X-Appwrite-Response-Format", "1.4.0");

            // 2. Setup Admin/Public Client
            // Used for fetching public data (like app_menus) before a user JWT exists
            _adminHttpClient = new HttpClient { BaseAddress = baseUri };
            _adminHttpClient.DefaultRequestHeaders.Add("X-Appwrite-Project", ProjectId);
            _adminHttpClient.DefaultRequestHeaders.Add("X-Appwrite-Response-Format", "1.4.0");

            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
            };
        }

        // ── Auth: Login and Session Management ───────────────────────────────

        public async Task<string?> LoginAsync(string email, string password, CancellationToken ct = default)
        {
            var body = new { email, password };
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Post, "account/sessions")
                {
                    Content = JsonContent.Create(body)
                };

                var resp = await _httpClient.SendAsync(request, ct);

                if (!resp.IsSuccessStatusCode)
                {
                    var err = await resp.Content.ReadAsStringAsync(ct);
                    Console.WriteLine($"[AppwriteService] Login failed: {err}");
                    return null;
                }

                // Appwrite sets a session cookie automatically in _cookieContainer.
                // Now exchange that session for a JWT.
                return await CreateJwtAsync(ct);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AppwriteService] Login error: {ex.Message}");
                return null;
            }
        }

        public void SignOut()
        {
            // 1. Clear JWT header
            if (_httpClient.DefaultRequestHeaders.Contains("X-Appwrite-JWT"))
                _httpClient.DefaultRequestHeaders.Remove("X-Appwrite-JWT");

            // 2. Clear Cookies
            try
            {
                var cookies = _cookieContainer.GetCookies(new Uri(Endpoint));
                foreach (Cookie cookie in cookies)
                {
                    cookie.Expired = true;
                }
            }
            catch
            {
                // Handle cases where Endpoint might be malformed or empty
            }

            Console.WriteLine("[AppwriteService] Session headers and cookies cleared.");
        }

        public async Task<List<string>> GetUserLabelsAsync(CancellationToken ct = default)
        {
            try
            {
                // 1. Create the request
                var request = new HttpRequestMessage(HttpMethod.Get, "account");

                // 2. We do NOT add the Cookie header here.
                // Instead, we rely on the X-Appwrite-JWT already in _httpClient.DefaultRequestHeaders.

                // 3. To prevent the "Cookie + JWT" error, we can try to suppress 
                // cookies for this specific request if the handler allows it.
                // On many platforms, setting an empty string fails, so we use this:
                request.Headers.TryAddWithoutValidation("Cookie", " ");

                var resp = await _httpClient.SendAsync(request, ct);

                if (!resp.IsSuccessStatusCode)
                {
                    var err = await resp.Content.ReadAsStringAsync(ct);
                    // If we still see the "JWT and Cookie" error, we use the fallback below
                    if (err.Contains("user_jwt_and_cookie_set"))
                    {
                        return await GetUserLabelsWithCleanClientAsync(ct);
                    }
                    Console.WriteLine($"[AppwriteService] GetAccount failed: {err}");
                    return new List<string>();
                }

                var json = await resp.Content.ReadAsStringAsync(ct);
                using var doc = JsonDocument.Parse(json);

                var labels = new List<string>();
                if (doc.RootElement.TryGetProperty("labels", out var labelsEl))
                {
                    foreach (var label in labelsEl.EnumerateArray())
                        labels.Add(label.GetString() ?? "");
                }
                return labels;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AppwriteService] Labels Exception: {ex.Message}");
                return new List<string>();
            }
        }

        private async Task<List<string>> GetUserLabelsWithCleanClientAsync(CancellationToken ct)
        {
            // Create a temporary client that has NO CookieContainer
            using var cleanHandler = new HttpClientHandler { UseCookies = false };
            using var cleanClient = new HttpClient(cleanHandler) { BaseAddress = _httpClient.BaseAddress };

            // Copy the Project ID and JWT from the main client
            cleanClient.DefaultRequestHeaders.Add("X-Appwrite-Project", ProjectId);
            cleanClient.DefaultRequestHeaders.Add("X-Appwrite-Response-Format", "1.4.0");

            if (_httpClient.DefaultRequestHeaders.TryGetValues("X-Appwrite-JWT", out var jwtValues))
            {
                cleanClient.DefaultRequestHeaders.Add("X-Appwrite-JWT", jwtValues.FirstOrDefault());
            }

            var resp = await cleanClient.GetAsync("account", ct);
            if (!resp.IsSuccessStatusCode) return new List<string>();

            var json = await resp.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(json);

            var labels = new List<string>();
            if (doc.RootElement.TryGetProperty("labels", out var labelsEl))
            {
                foreach (var label in labelsEl.EnumerateArray())
                    labels.Add(label.GetString() ?? "");
            }
            return labels;
        }

        public async Task<string> GetUserRoleFromPrefsAsync(CancellationToken ct = default)
        {
            try
            {
                var resp = await _httpClient.GetAsync("account/prefs", ct);
                if (!resp.IsSuccessStatusCode) return "User";

                var json = await resp.Content.ReadAsStringAsync(ct);
                var doc = JsonDocument.Parse(json);

                // Assumes you stored { "role": "Admin" } in Appwrite
                if (doc.RootElement.TryGetProperty("role", out var roleProp))
                {
                    return roleProp.GetString() ?? "User";
                }
            }
            catch { }
            return "User";
        }

        private async Task<string?> CreateJwtAsync(CancellationToken ct)
        {
            try
            {
                // Use the standard endpoint used by Appwrite Cloud
                var request = new HttpRequestMessage(HttpMethod.Post, "account/jwt")
                {
                    Content = new StringContent("{}", Encoding.UTF8, "application/json")
                };

                var resp = await _httpClient.SendAsync(request, ct);

                if (!resp.IsSuccessStatusCode)
                {
                    var error = await resp.Content.ReadAsStringAsync(ct);
                    Console.WriteLine($"[AppwriteService] JWT Creation Failed: {resp.StatusCode} - {error}");
                    return null;
                }

                var json = await resp.Content.ReadAsStringAsync(ct);
                using var doc = JsonDocument.Parse(json);

                // Standard Appwrite response is { "jwt": "..." }
                if (doc.RootElement.TryGetProperty("jwt", out var jwtProp))
                {
                    return jwtProp.GetString();
                }

                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AppwriteService] JWT Exception: {ex.Message}");
                return null;
            }
        }

        private async Task<string?> CreateJwtLegacyAsync(CancellationToken ct)
        {
            try
            {
                var resp = await _httpClient.PostAsync("account/jwt", new StringContent("{}", Encoding.UTF8, "application/json"), ct);
                if (!resp.IsSuccessStatusCode) return null;

                var json = await resp.Content.ReadAsStringAsync(ct);
                var doc = JsonDocument.Parse(json);
                return doc.RootElement.TryGetProperty("jwt", out var j) ? j.GetString() : null;
            }
            catch { return null; }
        }

        public void SetSessionJwt(string jwt)
        {
            if (_httpClient.DefaultRequestHeaders.Contains("X-Appwrite-JWT"))
                _httpClient.DefaultRequestHeaders.Remove("X-Appwrite-JWT");

            _httpClient.DefaultRequestHeaders.Add("X-Appwrite-JWT", jwt);
        }

        // ── Data Fetching: Notifications ─────────────────────────────────────

        public async Task<(List<NotificationLog> logs, int total)> GetNotificationLogsAsync(
            int limit = 25,
            int offset = 0,
            string? statusFilter = null,
            string? lineFilter = null,
            CancellationToken ct = default)
        {
            if (!_httpClient.DefaultRequestHeaders.Contains("X-Appwrite-JWT"))
            {
                Console.WriteLine("[AppwriteService] WARNING: No JWT found in headers!");
            }
            var queries = new List<string> { $"limit({limit})", $"offset({offset})", "orderDesc(\"sentAt\")" };
            if (!string.IsNullOrEmpty(statusFilter)) queries.Add($"equal(\"status\",\"{statusFilter}\")");
            if (!string.IsNullOrEmpty(lineFilter)) queries.Add($"equal(\"lineId\",\"{lineFilter}\")");

            var queryString = string.Join("&", queries.Select(q => $"queries[]={Uri.EscapeDataString(q)}"));
            var url = $"databases/{DatabaseId}/collections/{CollectionId}/documents?{queryString}";

            try
            {
                var response = await _httpClient.GetAsync(url, ct);
                response.EnsureSuccessStatusCode();

                var json = await response.Content.ReadAsStringAsync(ct);
                var raw = JsonDocument.Parse(json);
                var total = raw.RootElement.GetProperty("total").GetInt32();

                var logs = raw.RootElement.GetProperty("documents").EnumerateArray()
                              .Select(ParseDocument).ToList();

                return (logs, total);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AppwriteService] GetLogs error: {ex.Message}");
                return (new List<NotificationLog>(), 0);
            }
        }

        public async Task<List<NotificationLog>> GetRecentLogsAsync(int count = 5, CancellationToken ct = default)
        {
            var (logs, _) = await GetNotificationLogsAsync(limit: count, ct: ct);
            return logs;
        }

        public async Task<DashboardStats> GetDashboardStatsAsync(CancellationToken ct = default)
        {
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

        // ── Data Fetching: Menus ─────────────────────────────────────────────

        public async Task<List<AppMenu>> GetAppMenusAsync(CancellationToken ct = default)
        {
            var url = $"databases/{DatabaseId}/collections/{MenuCollectionId}/documents?queries[]={Uri.EscapeDataString("limit(50)")}&queries[]={Uri.EscapeDataString("orderAsc(\"orderIndex\")")}";

            try
            {
                // Use _adminHttpClient to allow fetching before user login
                var response = await _adminHttpClient.GetAsync(url, ct);
                response.EnsureSuccessStatusCode();

                var json = await response.Content.ReadAsStringAsync(ct);
                var root = JsonDocument.Parse(json).RootElement;
                var menus = new List<AppMenu>();

                foreach (var doc in root.GetProperty("documents").EnumerateArray())
                {
                    menus.Add(new AppMenu
                    {
                        Id = doc.TryGetProperty("$id", out var id) ? id.GetString() : "",
                        Title = doc.TryGetProperty("title", out var t) ? t.GetString() : "",
                        Icon = doc.TryGetProperty("icon", out var i) ? i.GetString() : "",
                        Route = doc.TryGetProperty("route", out var r) ? r.GetString() : "",
                        OrderIndex = doc.TryGetProperty("orderIndex", out var o) && o.TryGetInt32(out var v) ? v : 0,
                        AllowedRoles = ParseRoles(doc)
                    });
                }
                return menus;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AppwriteService] GetAppMenus error: {ex.Message}");
                return new List<AppMenu>();
            }
        }

        // ── Internal Helpers ─────────────────────────────────────────────────

        private static List<string> ParseRoles(JsonElement doc)
        {
            var roles = new List<string>();
            if (doc.TryGetProperty("allowedRoles", out var rolesEl))
            {
                if (rolesEl.ValueKind == JsonValueKind.Array)
                    roles.AddRange(rolesEl.EnumerateArray().Select(r => r.GetString() ?? ""));
                else if (rolesEl.ValueKind == JsonValueKind.String)
                {
                    try { roles = JsonSerializer.Deserialize<List<string>>(rolesEl.GetString()!) ?? new List<string>(); }
                    catch { roles.Add("All"); }
                }
            }
            return roles;
        }

        private static NotificationLog ParseDocument(JsonElement doc)
        {
            string GetStr(string key) => doc.TryGetProperty(key, out var p) ? p.GetString() ?? "" : "";

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
                SentAt = doc.TryGetProperty("sentAt", out var s) && DateTime.TryParse(s.GetString(), out var dt) ? dt : DateTime.UtcNow,

                SupervisorName = doc.TryGetProperty("supervisorName", out var sn) ? sn.GetString() : null,
                SupervisorEmail = doc.TryGetProperty("supervisorEmail", out var se) ? se.GetString() : null,
                EngineerName = doc.TryGetProperty("engineerName", out var en) ? en.GetString() : null,
                EngineerEmail = doc.TryGetProperty("engineerEmail", out var ee) ? ee.GetString() : null,
                EngineerPhone = doc.TryGetProperty("engineerPhone", out var ep) ? ep.GetString() : null,
                SupervisorPhone = doc.TryGetProperty("supervisorPhone", out var sp) ? sp.GetString() : null,
            };
        }

        // ── Register FCM device token with Appwrite ──────────────────────────
        public async Task RegisterPushTokenAsync(string fcmToken, CancellationToken ct = default)
        {
            try
            {
                // 1. Get the JWT from your main client headers
                if (!_httpClient.DefaultRequestHeaders.TryGetValues("X-Appwrite-JWT", out var jwtValues))
                {
                    Console.WriteLine("[Appwrite] Registration failed: No JWT found in headers.");
                    return;
                }
                var jwt = jwtValues.FirstOrDefault();

                // 2. Create a temporary handler with NO Cookies
                using var cleanHandler = new HttpClientHandler { UseCookies = false };
                using var cleanClient = new HttpClient(cleanHandler) { BaseAddress = _httpClient.BaseAddress };

                // 3. Copy necessary headers to the clean client
                cleanClient.DefaultRequestHeaders.Add("X-Appwrite-Project", ProjectId);
                cleanClient.DefaultRequestHeaders.Add("X-Appwrite-Response-Format", "1.4.0");
                cleanClient.DefaultRequestHeaders.Add("X-Appwrite-JWT", jwt);

                var body = new
                {
                    targetId = Guid.NewGuid().ToString("N"),
                    identifier = fcmToken,
                    providerId = "69fdb2740013531089c4"
                };

                // 4. Send the request using the clean client
                var resp = await cleanClient.PostAsJsonAsync("account/targets/push", body, _jsonOptions, ct);
                var json = await resp.Content.ReadAsStringAsync(ct);

                if (resp.IsSuccessStatusCode)
                {
                    Console.WriteLine("[Appwrite] Success! Push target registered.");
                }
                else
                {
                    Console.WriteLine($"[Appwrite] Registration failed: {json}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AppwriteService] Exception: {ex.Message}");
            }
        }
    }
}