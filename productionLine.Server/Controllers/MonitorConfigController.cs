using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using productionLine.Server.DTO;
using productionLine.Server.Model;
using System.Text.Json;

namespace productionLine.Server.Controllers
{
    // ─────────────────────────────────────────────────────────────────────────
    // MonitorConfigController
    // Base route: /api/monitor
    //
    // Endpoints:
    //
    //  BULK
    //    GET    /api/monitor/config                 → full config (all sections)
    //    POST   /api/monitor/config                 → bulk upsert (frontend Save button)
    //
    //  LINES
    //    GET    /api/monitor/lines                  → all lines
    //    GET    /api/monitor/lines/{id}             → single line
    //    POST   /api/monitor/lines                  → create line
    //    PUT    /api/monitor/lines/{id}             → update line
    //    DELETE /api/monitor/lines/{id}             → delete line
    //    GET    /api/monitor/lines/{id}/shift-incharge → who is on duty right now
    //
    //  RECIPIENTS
    //    GET    /api/monitor/recipients             → all recipients
    //    GET    /api/monitor/recipients/{id}        → single recipient
    //    POST   /api/monitor/recipients             → create recipient
    //    PUT    /api/monitor/recipients/{id}        → update recipient
    //    DELETE /api/monitor/recipients/{id}        → delete recipient
    //    POST   /api/monitor/recipients/{id}/device-token → register device token (MAUI app)
    //    DELETE /api/monitor/recipients/{id}/device-token → unregister token
    //
    //  QUIET HOURS
    //    GET    /api/monitor/quiet-hours            → get (single record)
    //    PUT    /api/monitor/quiet-hours            → upsert
    //
    //  SHIFTS
    //    GET    /api/monitor/shifts                 → all shifts
    //    PUT    /api/monitor/shifts                 → bulk upsert shifts (A/B/C)
    //    PUT    /api/monitor/shifts/{key}           → update single shift by key
    //
    //  NOTIFICATIONS
    //    GET    /api/monitor/notification-log       → recent log (last 200)
    //    GET    /api/monitor/notification-log/line/{lineId}  → log for one line
    //
    // ─────────────────────────────────────────────────────────────────────────

    [Route("api/monitor")]
    [ApiController]
    public class MonitorConfigController : ControllerBase
    {
        private readonly FormDbContext _db;
        private readonly ILogger<MonitorConfigController> _logger;

        // Well-known GUID for the single QuietHours row
        private static readonly Guid QuietHoursRowId = Guid.Parse("00000000-0000-0000-0000-000000000001");

        public MonitorConfigController(FormDbContext db, ILogger<MonitorConfigController> logger)
        {
            _db = db;
            _logger = logger;
        }

        // ─────────────────────────────────────────────────────────────────────
        // HELPERS
        // ─────────────────────────────────────────────────────────────────────

        private static int TimeToMinutes(string? t)
        {
            if (string.IsNullOrWhiteSpace(t)) return 0;
            var parts = t.Split(':');
            if (parts.Length < 2) return 0;
            return int.Parse(parts[0]) * 60 + int.Parse(parts[1]);
        }

        private static bool IsTimeInRange(int nowMin, int startMin, int endMin)
        {
            // Handles midnight crossover (e.g. 23:15 → 06:00)
            if (startMin <= endMin)
                return nowMin >= startMin && nowMin < endMin;
            return nowMin >= startMin || nowMin < endMin;
        }

        private static string CurrentShiftKey(IEnumerable<ShiftConfig> shifts)
        {
            var now = DateTime.Now.Hour * 60 + DateTime.Now.Minute;
            foreach (var s in shifts)
            {
                if (IsTimeInRange(now, TimeToMinutes(s.Start), TimeToMinutes(s.End)))
                    return s.Key;
            }
            return string.Empty;
        }

        private static (bool inBreak, string? name) CheckBreak(IEnumerable<ShiftConfig> shifts)
        {
            var now = DateTime.Now.Hour * 60 + DateTime.Now.Minute;
            foreach (var s in shifts)
            {
                foreach (var b in s.Breaks)
                {
                    if (IsTimeInRange(now, TimeToMinutes(b.Start), TimeToMinutes(b.End)))
                        return (true, b.Name);
                }
            }
            return (false, null);
        }

        // ── Mapping helpers ───────────────────────────────────────────────────

        private static LineConfigResponse MapLine(LineConfig e) => new()
        {
            Id = e.Id,
            Plant = e.Plant,
            FormId = e.FormId,
            ShiftTemplateId = e.ShiftTemplateId,
            Engineers = e.Engineers.Select(MapPerson).ToList(),
            Supervisors = e.Supervisors.Select(MapPerson).ToList(),
            CreatedAt = e.CreatedAt,
            UpdatedAt = e.UpdatedAt,
        };

        private static PersonConfigDto MapPerson(PersonConfig p) => new()
        {
            Id = p.Id,
            Name = p.Name,
            Phone = p.Phone,
            Email = p.Email,
            Shift = p.Shift,
        };

        private static PersonConfig MapPersonFromDto(PersonConfigDto d) => new()
        {
            Id = d.Id ?? Guid.NewGuid().ToString(),
            Name = d.Name,
            Phone = d.Phone,
            Email = d.Email,
            Shift = d.Shift,
        };

        private static RecipientConfigResponse MapRecipient(RecipientConfig e) => new()
        {
            Id = e.Id,
            Name = e.Name,
            Email = e.Email,
            Phone = e.Phone,
            Enabled = e.Enabled,
            DelayMin = e.DelayMin,
            Android = e.Android,
            Ios = e.Ios,
            LineIds = e.LineIds,
            DeviceTokens = e.DeviceTokens.Select(t => new DeviceTokenDto { Token = t.Token, Platform = t.Platform }).ToList(),
            CreatedAt = e.CreatedAt,
            UpdatedAt = e.UpdatedAt,
        };

        private static QuietHoursResponse MapQuietHours(QuietHoursConfig e) => new()
        {
            Id = e.Id,
            Enabled = e.Enabled,
            Start = e.Start,
            End = e.End,
            SkipBreaks = e.SkipBreaks,
            UpdatedAt = e.UpdatedAt,
        };

        private static ShiftConfigResponse MapShift(ShiftConfig e) => new()
        {
            Id = e.Id,
            Key = e.Key,
            Name = e.Name,
            Start = e.Start,
            End = e.End,
            UpdatedAt = e.UpdatedAt,
            Breaks = e.Breaks.Select(b => new BreakConfigDto
            {
                Id = b.Id,
                Name = b.Name,
                Start = b.Start,
                End = b.End,
            }).ToList(),
        };

        // ─────────────────────────────────────────────────────────────────────
        // BULK ENDPOINTS
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// GET /api/monitor/config
        /// Returns the full configuration snapshot — used by the React config page on load.
        /// </summary>
        [HttpGet("config")]
        public async Task<IActionResult> GetFullConfig()
        {
            try
            {
                var lines = await _db.LineConfigs.AsNoTracking().ToListAsync();
                var recipients = await _db.RecipientConfigs.AsNoTracking().ToListAsync();
                var quiet = await _db.QuietHoursConfigs.AsNoTracking().FirstOrDefaultAsync();
                var shifts = await _db.ShiftConfigs.AsNoTracking().OrderBy(s => s.Key).ToListAsync();

                return Ok(new MonitorConfigBulkResponse
                {
                    Lines = lines.Select(MapLine).ToList(),
                    Recipients = recipients.Select(MapRecipient).ToList(),
                    QuietHours = quiet != null ? MapQuietHours(quiet) : null,
                    Shifts = shifts.Select(MapShift).ToList(),
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetFullConfig failed");
                return StatusCode(500, new { message = "Failed to load configuration." });
            }
        }

        /// <summary>
        /// POST /api/monitor/config
        /// Bulk upsert — replaces all sections that are present in the request body.
        /// Called by the React "Save Changes" button.
        /// </summary>
        [HttpPost("config")]
        public async Task<IActionResult> SaveFullConfig([FromBody] MonitorConfigBulkRequest req)
        {
            try
            {
                // ── Lines ──────────────────────────────────────────────────
                if (req.Lines != null)
                {
                    var existing = await _db.LineConfigs.ToListAsync();
                    _db.LineConfigs.RemoveRange(existing);

                    foreach (var dto in req.Lines)
                    {
                        var entity = new LineConfig
                        {
                            Id = Guid.NewGuid(),
                            Plant = dto.Plant,
                            FormId = dto.FormId,
                            ShiftTemplateId = dto.ShiftTemplateId,
                            CreatedAt = DateTime.Now,
                            UpdatedAt = DateTime.Now,
                        };

                        entity.Engineers = dto.Engineers?.Select(MapPersonFromDto).ToList() ?? new();
                        entity.Supervisors = dto.Supervisors?.Select(MapPersonFromDto).ToList() ?? new();

                        _db.LineConfigs.Add(entity);
                    }
                }

                // ── Recipients ─────────────────────────────────────────────
                if (req.Recipients != null)
                {
                    var existingRecipients = await _db.RecipientConfigs.AsNoTracking().ToListAsync();

                    // Remove the old ones from the DB tracking
                    var existingToRemove = await _db.RecipientConfigs.ToListAsync();
                    _db.RecipientConfigs.RemoveRange(existingToRemove);

                    foreach (var dto in req.Recipients)
                    {
                        var oldRecord = existingRecipients.FirstOrDefault(r => r.Id == dto.Id);
                        var entity = new RecipientConfig
                        {
                            Id = dto.Id, // 🚨 CRITICAL: Keep the same ID! Do NOT use Guid.NewGuid() here!
                            Name = dto.Name,
                            Email = dto.Email,
                            Phone = dto.Phone,
                            Enabled = dto.Enabled,
                            DelayMin = Math.Clamp(dto.DelayMin, 1, 120),
                            Android = dto.Android,
                            Ios = dto.Ios,
                            CreatedAt = oldRecord?.CreatedAt ?? DateTime.Now,
                            UpdatedAt = DateTime.Now,

                            // 🚨 CRITICAL: Rescue the tokens from the old record so the React app doesn't wipe them!
                            DeviceTokensJson = oldRecord?.DeviceTokensJson
                        };

                        entity.LineIds = dto.LineIds ?? new List<string>();
                        _db.RecipientConfigs.Add(entity);
                    }
                }

                // ── Quiet Hours (FIXED) ────────────────────────────────────
                if (req.QuietHours != null)
                {
                    var qh = await _db.QuietHoursConfigs.FirstOrDefaultAsync();

                    if (qh == null)
                    {
                        // ➕ INSERT
                        qh = new QuietHoursConfig
                        {
                            Id = QuietHoursRowId,
                            UpdatedAt = DateTime.Now
                        };
                        _db.QuietHoursConfigs.Add(qh);
                    }

                    // ✏️ UPDATE values
                    qh.Enabled = req.QuietHours.Enabled;
                    qh.Start = req.QuietHours.Start;
                    qh.End = req.QuietHours.End;
                    qh.SkipBreaks = req.QuietHours.SkipBreaks;
                    qh.UpdatedAt = DateTime.Now;
                }

                // ── Shifts ─────────────────────────────────────────────────
                if (req.Shifts != null)
                {
                    var existing = await _db.ShiftConfigs.ToListAsync();
                    _db.ShiftConfigs.RemoveRange(existing);

                    foreach (var dto in req.Shifts)
                    {
                        var entity = new ShiftConfig
                        {
                            Id = Guid.NewGuid(),
                            Key = dto.Key,
                            Name = dto.Name,
                            Start = dto.Start,
                            End = dto.End,
                            UpdatedAt = DateTime.Now,
                        };

                        entity.Breaks = dto.Breaks?.Select((b, i) => new productionLine.Server.Model.BreakConfig
                        {
                            Id = i + 1, // ✅ FORCE numeric safe ID
                            Name = b.Name,
                            Start = b.Start,
                            End = b.End
                        }).ToList() ?? new();

                        _db.ShiftConfigs.Add(entity);
                    }
                }

                await _db.SaveChangesAsync();

                return Ok(new { message = "Configuration saved successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SaveFullConfig failed");
                return StatusCode(500, new { message = $"Save failed: {ex.Message}" });
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // LINE ENDPOINTS
        // ─────────────────────────────────────────────────────────────────────

        [HttpGet("lines")]
        public async Task<IActionResult> GetLines()
        {
            var lines = await _db.LineConfigs.AsNoTracking().ToListAsync();
            return Ok(lines.Select(MapLine));
        }

        [HttpGet("lines/{id:guid}")]
        public async Task<IActionResult> GetLine(Guid id)
        {
            var line = await _db.LineConfigs.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
            if (line == null) return NotFound(new { message = "Line not found." });
            return Ok(MapLine(line));
        }

        [HttpPost("lines")]
        public async Task<IActionResult> CreateLine([FromBody] LineConfigRequest dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Plant) || string.IsNullOrWhiteSpace(dto.FormId))
                return BadRequest(new { message = "Plant and FormId are required." });

            var entity = new LineConfig
            {
                Id = Guid.NewGuid(),
                Plant = dto.Plant,
                FormId = dto.FormId,
                ShiftTemplateId = dto.ShiftTemplateId,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
            };
            entity.Engineers = dto.Engineers.Select(MapPersonFromDto).ToList();
            entity.Supervisors = dto.Supervisors.Select(MapPersonFromDto).ToList();

            _db.LineConfigs.Add(entity);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetLine), new { id = entity.Id }, MapLine(entity));
        }

        [HttpPut("lines/{id:guid}")]
        public async Task<IActionResult> UpdateLine(Guid id, [FromBody] LineConfigRequest dto)
        {
            var entity = await _db.LineConfigs.FirstOrDefaultAsync(l => l.Id == id);
            if (entity == null) return NotFound(new { message = "Line not found." });

            entity.Plant = dto.Plant;
            entity.FormId = dto.FormId;
            entity.ShiftTemplateId = dto.ShiftTemplateId;
            entity.Engineers = dto.Engineers.Select(MapPersonFromDto).ToList();
            entity.Supervisors = dto.Supervisors.Select(MapPersonFromDto).ToList();
            entity.UpdatedAt = DateTime.Now;

            await _db.SaveChangesAsync();
            return Ok(MapLine(entity));
        }

        [HttpDelete("lines/{id:guid}")]
        public async Task<IActionResult> DeleteLine(Guid id)
        {
            var entity = await _db.LineConfigs.FirstOrDefaultAsync(l => l.Id == id);
            if (entity == null) return NotFound(new { message = "Line not found." });

            _db.LineConfigs.Remove(entity);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Line deleted." });
        }

        /// <summary>
        /// GET /api/monitor/lines/{id}/shift-incharge
        /// Returns the supervisors and engineers currently on duty for this line,
        /// plus whether a break is currently active.
        /// Used by the .NET MAUI mobile app when a line DOWN alert is tapped.
        /// </summary>
        [HttpGet("lines/{id:guid}/shift-incharge")]
        public async Task<IActionResult> GetShiftIncharge(Guid id)
        {
            try
            {
                var line = await _db.LineConfigs.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
                if (line == null) return NotFound(new { message = "Line not found." });

                var shifts = await _db.ShiftConfigs.AsNoTracking().ToListAsync();

                var now = DateTime.Now.Hour * 60 + DateTime.Now.Minute;
                var currentKey = CurrentShiftKey(shifts);
                var (inBreak, breakName) = CheckBreak(shifts);

                var activeShift = shifts.FirstOrDefault(s => s.Key == currentKey);

                var supervisors = line.Supervisors
                    .Where(s => s.Shift == currentKey || string.IsNullOrEmpty(currentKey))
                    .Select(MapPerson)
                    .ToList();

                var engineers = line.Engineers
                    .Where(e => e.Shift == currentKey || string.IsNullOrEmpty(currentKey))
                    .Select(MapPerson)
                    .ToList();

                return Ok(new ShiftInchargeResponse
                {
                    CurrentShift = currentKey,
                    ShiftStart = activeShift?.Start ?? string.Empty,
                    ShiftEnd = activeShift?.End ?? string.Empty,
                    IsInBreak = inBreak,
                    BreakName = breakName,
                    Supervisors = supervisors,
                    Engineers = engineers,
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetShiftIncharge failed for line {id}", id);
                return StatusCode(500, new { message = "Failed to determine shift incharge." });
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // RECIPIENT ENDPOINTS
        // ─────────────────────────────────────────────────────────────────────

        [HttpGet("recipients")]
        public async Task<IActionResult> GetRecipients()
        {
            var list = await _db.RecipientConfigs.AsNoTracking().ToListAsync();
            return Ok(list.Select(MapRecipient));
        }

        [HttpGet("recipients/{id:guid}")]
        public async Task<IActionResult> GetRecipient(Guid id)
        {
            var entity = await _db.RecipientConfigs.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id);
            if (entity == null) return NotFound(new { message = "Recipient not found." });
            return Ok(MapRecipient(entity));
        }

        [HttpPost("recipients")]
        public async Task<IActionResult> CreateRecipient([FromBody] RecipientConfigRequest dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { message = "Name is required." });

            var entity = new RecipientConfig
            {
                Id = Guid.NewGuid(),
                Name = dto.Name,
                Email = dto.Email,
                Phone = dto.Phone,
                Enabled = dto.Enabled,
                DelayMin = Math.Clamp(dto.DelayMin, 1, 120),
                Android = dto.Android,
                Ios = dto.Ios,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
            };
            entity.LineIds = dto.LineIds ?? new List<string>();

            _db.RecipientConfigs.Add(entity);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRecipient), new { id = entity.Id }, MapRecipient(entity));
        }

        [HttpPut("recipients/{id:guid}")]
        public async Task<IActionResult> UpdateRecipient(Guid id, [FromBody] RecipientConfigRequest dto)
        {
            var entity = await _db.RecipientConfigs.FirstOrDefaultAsync(r => r.Id == id);
            if (entity == null) return NotFound(new { message = "Recipient not found." });

            entity.Name = dto.Name;
            entity.Email = dto.Email;
            entity.Phone = dto.Phone;
            entity.Enabled = dto.Enabled;
            entity.DelayMin = Math.Clamp(dto.DelayMin, 1, 120);
            entity.Android = dto.Android;
            entity.Ios = dto.Ios;
            entity.LineIds = dto.LineIds ?? new List<string>();
            entity.UpdatedAt = DateTime.Now;

            await _db.SaveChangesAsync();
            return Ok(MapRecipient(entity));
        }

        [HttpDelete("recipients/{id:guid}")]
        public async Task<IActionResult> DeleteRecipient(Guid id)
        {
            var entity = await _db.RecipientConfigs.FirstOrDefaultAsync(r => r.Id == id);
            if (entity == null) return NotFound(new { message = "Recipient not found." });

            _db.RecipientConfigs.Remove(entity);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Recipient deleted." });
        }

        /// <summary>
        /// POST /api/monitor/recipients/{id}/device-token
        /// Called by the .NET MAUI app after FCM/APNs registration to store the
        /// device token so the server can send push notifications.
        /// </summary>
        [HttpPost("recipients/{id:guid}/device-token")]
        public async Task<IActionResult> RegisterDeviceToken(Guid id, [FromBody] RegisterDeviceTokenRequest dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Token))
                return BadRequest(new { message = "Token is required." });

            var entity = await _db.RecipientConfigs.FirstOrDefaultAsync(r => r.Id == id);
            if (entity == null) return NotFound(new { message = "Recipient not found." });

            // 1. Get the list
            var tokens = entity.DeviceTokens;

            // 2. Add or update the token
            var existing = tokens.FirstOrDefault(t => t.Token == dto.Token || t.Platform == dto.Platform);
            if (existing != null)
            {
                existing.Token = dto.Token;
                existing.Platform = dto.Platform.ToLower();
                existing.RegisteredAt = DateTime.Now;
            }
            else
            {
                tokens.Add(new DeviceToken
                {
                    Token = dto.Token,
                    Platform = dto.Platform.ToLower(),
                    RegisteredAt = DateTime.Now,
                });
            }

            // 3. 🚨 CRITICAL FIX: You MUST call this to pack the list back into the JSON string!
            entity.SyncJsonFields();

            entity.UpdatedAt = DateTime.Now;
            await _db.SaveChangesAsync();

            return Ok(new { message = "Device token registered." });
        }

        /// <summary>
        /// DELETE /api/monitor/recipients/{id}/device-token
        /// Called on app logout or token rotation.
        /// </summary>
        [HttpDelete("recipients/{id:guid}/device-token")]
        public async Task<IActionResult> UnregisterDeviceToken(Guid id, [FromQuery] string token)
        {
            if (string.IsNullOrWhiteSpace(token))
                return BadRequest(new { message = "Token query param is required." });

            var entity = await _db.RecipientConfigs.FirstOrDefaultAsync(r => r.Id == id);
            if (entity == null) return NotFound(new { message = "Recipient not found." });

            var tokens = entity.DeviceTokens.Where(t => t.Token != token).ToList();
            entity.DeviceTokens = tokens;
            entity.UpdatedAt = DateTime.Now;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Device token removed." });
        }

        // ─────────────────────────────────────────────────────────────────────
        // QUIET HOURS ENDPOINTS
        // ─────────────────────────────────────────────────────────────────────

        [HttpGet("quiet-hours")]
        public async Task<IActionResult> GetQuietHours()
        {
            var qh = await _db.QuietHoursConfigs.AsNoTracking().FirstOrDefaultAsync();
            if (qh == null)
                return Ok(new QuietHoursResponse { Enabled = false, SkipBreaks = true });
            return Ok(MapQuietHours(qh));
        }

        [HttpPut("quiet-hours")]
        public async Task<IActionResult> UpsertQuietHours([FromBody] QuietHoursRequest dto)
        {
            var qh = await _db.QuietHoursConfigs.FirstOrDefaultAsync()
                     ?? new QuietHoursConfig { Id = QuietHoursRowId };

            qh.Enabled = dto.Enabled;
            qh.Start = dto.Start;
            qh.End = dto.End;
            qh.SkipBreaks = dto.SkipBreaks;
            qh.UpdatedAt = DateTime.Now;

            _db.Update(qh);
            await _db.SaveChangesAsync();
            return Ok(MapQuietHours(qh));
        }

        // ─────────────────────────────────────────────────────────────────────
        // SHIFT ENDPOINTS
        // ─────────────────────────────────────────────────────────────────────

        [HttpGet("shifts")]
        public async Task<IActionResult> GetShifts()
        {
            var shifts = await _db.ShiftConfigs.AsNoTracking().OrderBy(s => s.Key).ToListAsync();
            return Ok(shifts.Select(MapShift));
        }

        /// <summary>
        /// PUT /api/monitor/shifts
        /// Replaces all shift records. Send all three shifts (A, B, C) together.
        /// </summary>
        [HttpPut("shifts")]
        public async Task<IActionResult> UpsertShifts([FromBody] List<ShiftConfigRequest> dtos)
        {
            var existing = await _db.ShiftConfigs.ToListAsync();
            _db.ShiftConfigs.RemoveRange(existing);

            foreach (var dto in dtos)
            {
                if (string.IsNullOrWhiteSpace(dto.Key)) continue;
                var entity = new ShiftConfig
                {
                    Id = Guid.NewGuid(),
                    Key = dto.Key.ToUpper(),
                    Name = dto.Name,
                    Start = dto.Start,
                    End = dto.End,
                    UpdatedAt = DateTime.Now,
                };
                entity.Breaks = dto.Breaks.Select(b => new productionLine.Server.Model.BreakConfig
                {
                    Id = b.Id,
                    Name = b.Name,
                    Start = b.Start,   // map renamed fields
                    End = b.End
                }).ToList();
                _db.ShiftConfigs.Add(entity);
            }

            await _db.SaveChangesAsync();

            var result = await _db.ShiftConfigs.AsNoTracking().OrderBy(s => s.Key).ToListAsync();
            return Ok(result.Select(MapShift));
        }

        /// <summary>
        /// PUT /api/monitor/shifts/{key}
        /// Updates a single shift by key (A, B, or C).
        /// </summary>
        [HttpPut("shifts/{key}")]
        public async Task<IActionResult> UpsertShiftByKey(string key, [FromBody] ShiftConfigRequest dto)
        {
            key = key.ToUpper();
            var entity = await _db.ShiftConfigs.FirstOrDefaultAsync(s => s.Key == key);

            if (entity == null)
            {
                entity = new ShiftConfig { Id = Guid.NewGuid(), Key = key };
                _db.ShiftConfigs.Add(entity);
            }

            entity.Name = dto.Name;
            entity.Start = dto.Start;
            entity.End = dto.End;
            entity.UpdatedAt = DateTime.Now;
            entity.Breaks = dto.Breaks.Select(b => new productionLine.Server.Model.BreakConfig
            {
                Id = b.Id,
                Name = b.Name,
                Start = b.Start,   // map renamed fields
                End = b.End
            }).ToList();

            await _db.SaveChangesAsync();
            return Ok(MapShift(entity));
        }

        // ─────────────────────────────────────────────────────────────────────
        // NOTIFICATION LOG ENDPOINTS (read-only — written by notification service)
        // ─────────────────────────────────────────────────────────────────────

        [HttpGet("notification-log")]
        public async Task<IActionResult> GetNotificationLog([FromQuery] int count = 200)
        {
            count = Math.Clamp(count, 1, 1000);
            var logs = await _db.NotificationLogs
                .AsNoTracking()
                .OrderByDescending(l => l.SentAt)
                .Take(count)
                .ToListAsync();

            return Ok(logs.Select(MapLog));
        }

        [HttpGet("notification-log/line/{lineId}")]
        public async Task<IActionResult> GetNotificationLogByLine(string lineId, [FromQuery] int count = 50)
        {
            count = Math.Clamp(count, 1, 200);
            var logs = await _db.NotificationLogs
                .AsNoTracking()
                .Where(l => l.LineId == lineId)
                .OrderByDescending(l => l.SentAt)
                .Take(count)
                .ToListAsync();

            return Ok(logs.Select(MapLog));
        }

        private static NotificationLogResponse MapLog(NotificationLog l) => new()
        {
            Id = l.Id,
            LineId = l.LineId,
            LinePlant = l.LinePlant,
            RecipientId = l.RecipientId,
            RecipientName = l.RecipientName,
            Platform = l.Platform,
            Status = l.Status,
            SuppressReason = l.SuppressReason,
            SentAt = l.SentAt,
            ErrorMsg = l.ErrorMsg,
        };

        // ─────────────────────────────────────────────────────────────────────
        // BREAK-CHECK UTILITY ENDPOINT
        // GET /api/monitor/break-check
        // Returns whether we are currently in any break window.
        // Called by the notification service before firing alerts.
        // ─────────────────────────────────────────────────────────────────────

        [HttpGet("break-check")]
        public async Task<IActionResult> BreakCheck()
        {
            try
            {
                var shifts = await _db.ShiftConfigs.AsNoTracking().ToListAsync();
                var qh = await _db.QuietHoursConfigs.AsNoTracking().FirstOrDefaultAsync();

                var (inBreak, breakName) = CheckBreak(shifts);

                // Also check manual quiet window
                bool inQuiet = false;
                if (qh?.Enabled == true && !string.IsNullOrWhiteSpace(qh.Start) && !string.IsNullOrWhiteSpace(qh.End))
                {
                    var now = DateTime.Now.Hour * 60 + DateTime.Now.Minute;
                    inQuiet = IsTimeInRange(now, TimeToMinutes(qh.Start), TimeToMinutes(qh.End));
                }

                bool suppress = (inBreak && qh?.SkipBreaks == true) || inQuiet;

                return Ok(new
                {
                    shouldSuppress = suppress,
                    inBreak,
                    breakName,
                    inQuietHours = inQuiet,
                    currentShift = CurrentShiftKey(shifts),
                    checkedAt = DateTime.Now,
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "BreakCheck failed");
                return StatusCode(500, new { message = "Break check failed." });
            }
        }

        [HttpGet("templates/shift")]
        public async Task<IActionResult> GetShiftTemplates()
        {
            try
            {
                // 1. First, fetch raw data safely without complex string methods
                var rawTemplates = await _db.ReportTemplates
                    .Select(t => new
                    {
                        Id = t.Id,
                        Name = t.Name,
                        // If your string column is named differently, use that here:
                        ChartData = t.ChartConfig
                    })
                    .ToListAsync();

                // 2. Do the string manipulation and filtering IN MEMORY (client-side)
                // This prevents Oracle/EF Core translation crashes.
                var filteredTemplates = rawTemplates
                    .Where(t => t.ChartData != null && t.ChartData.ToString().Contains("\"shiftConfigs\""))
                    .Select(t => new
                    {
                        id = t.Id.ToString(), // Safe to do ToString() here
                        name = string.IsNullOrWhiteSpace(t.Name) ? $"Template #{t.Id}" : t.Name
                    })
                    .ToList();

                return Ok(filteredTemplates);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching shift templates.");
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }
    }
}
