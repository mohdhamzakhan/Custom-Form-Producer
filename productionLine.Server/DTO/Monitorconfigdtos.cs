using System.Text.Json.Serialization;

namespace productionLine.Server.DTO
{
    // ─────────────────────────────────────────────────────────────────────────
    // Shared value DTOs
    // ─────────────────────────────────────────────────────────────────────────

    public class PersonConfigDto
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("phone")]
        public string Phone { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("shift")]
        public string Shift { get; set; } = "A";
    }

    public class BreakConfigDto
    {
        [JsonPropertyName("id")]
        public long? Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("start")]
        public string Start { get; set; } = "00:00";

        [JsonPropertyName("end")]
        public string End { get; set; } = "00:00";
    }

    public class DeviceTokenDto
    {
        [JsonPropertyName("token")]
        public string Token { get; set; } = string.Empty;

        [JsonPropertyName("platform")]
        public string Platform { get; set; } = "android";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LINE CONFIG DTOs
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Used for POST /api/monitor/lines and PUT /api/monitor/lines/{id}</summary>
    public class LineConfigRequest
    {
        public int Id { get; set; }
        public string Plant { get; set; } = string.Empty;
        public string FormId { get; set; } = string.Empty;
        public string? ShiftTemplateId { get; set; }
        public List<PersonConfigDto> Engineers { get; set; } = new();
        public List<PersonConfigDto> Supervisors { get; set; } = new();
    }

    /// <summary>Returned for GET /api/monitor/lines and GET /api/monitor/lines/{id}</summary>
    public class LineConfigResponse
    {
        public Guid Id { get; set; }
        public string Plant { get; set; } = string.Empty;
        public string FormId { get; set; } = string.Empty;
        public string? ShiftTemplateId { get; set; }
        public List<PersonConfigDto> Engineers { get; set; } = new();
        public List<PersonConfigDto> Supervisors { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RECIPIENT CONFIG DTOs
    // ─────────────────────────────────────────────────────────────────────────

    public class RecipientConfigRequest
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public bool Enabled { get; set; } = true;
        public int DelayMin { get; set; } = 5;
        public bool Android { get; set; } = true;
        public bool Ios { get; set; } = false;

        /// <summary>Empty list = all lines.</summary>
        public List<string> LineIds { get; set; } = new();
    }

    public class RecipientConfigResponse
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public bool Enabled { get; set; }
        public int DelayMin { get; set; }
        public bool Android { get; set; }
        public bool Ios { get; set; }
        public List<string> LineIds { get; set; } = new();
        public List<DeviceTokenDto> DeviceTokens { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // QUIET HOURS DTOs
    // ─────────────────────────────────────────────────────────────────────────

    public class QuietHoursRequest
    {
        public bool Enabled { get; set; }
        public string? Start { get; set; }
        public string? End { get; set; }
        public bool SkipBreaks { get; set; } = true;
    }

    public class QuietHoursResponse
    {
        public Guid Id { get; set; }
        public bool Enabled { get; set; }
        public string? Start { get; set; }
        public string? End { get; set; }
        public bool SkipBreaks { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SHIFT CONFIG DTOs
    // ─────────────────────────────────────────────────────────────────────────

    public class ShiftConfigRequest
    {
        public string Key { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Start { get; set; } = "00:00";
        public string End { get; set; } = "00:00";
        public List<BreakConfigDto> Breaks { get; set; } = new();
    }

    public class ShiftConfigResponse
    {
        public Guid Id { get; set; }
        public string Key { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Start { get; set; } = string.Empty;
        public string End { get; set; } = string.Empty;
        public List<BreakConfigDto> Breaks { get; set; } = new();
        public DateTime UpdatedAt { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BULK SAVE DTO
    // POST /api/monitor/config  — saves all sections in one request
    // (Used by the React frontend's "Save Changes" button)
    // ─────────────────────────────────────────────────────────────────────────

    public class MonitorConfigBulkRequest
    {
        public List<LineConfigRequest>? Lines { get; set; }
        public List<RecipientConfigRequest>? Recipients { get; set; }
        public QuietHoursRequest? QuietHours { get; set; }
        public List<ShiftConfigRequest>? Shifts { get; set; }
    }

    public class MonitorConfigBulkResponse
    {
        public List<LineConfigResponse> Lines { get; set; } = new();
        public List<RecipientConfigResponse> Recipients { get; set; } = new();
        public QuietHoursResponse? QuietHours { get; set; }
        public List<ShiftConfigResponse> Shifts { get; set; } = new();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DEVICE TOKEN REGISTRATION
    // POST /api/monitor/recipients/{id}/device-token
    // Called by the .NET MAUI app when it gets a new FCM/APNs token
    // ─────────────────────────────────────────────────────────────────────────

    public class RegisterDeviceTokenRequest
    {
        /// <summary>FCM registration token or APNs device token.</summary>
        public string Token { get; set; } = string.Empty;

        /// <summary>"android" or "ios"</summary>
        public string Platform { get; set; } = "android";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NOTIFICATION LOG DTOs
    // ─────────────────────────────────────────────────────────────────────────

    public class NotificationLogResponse
    {
        public Guid Id { get; set; }
        public string LineId { get; set; } = string.Empty;
        public string LinePlant { get; set; } = string.Empty;
        public Guid RecipientId { get; set; }
        public string RecipientName { get; set; } = string.Empty;
        public string Platform { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? SuppressReason { get; set; }
        public DateTime SentAt { get; set; }
        public string? ErrorMsg { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SHIFT INCHARGE — used by the mobile app when a line goes DOWN
    // GET /api/monitor/lines/{lineId}/shift-incharge
    // Returns the supervisor (+ engineers) currently on shift right now
    // ─────────────────────────────────────────────────────────────────────────

    public class ShiftInchargeResponse
    {
        public string CurrentShift { get; set; } = string.Empty;
        public string ShiftStart { get; set; } = string.Empty;
        public string ShiftEnd { get; set; } = string.Empty;
        public bool IsInBreak { get; set; }
        public string? BreakName { get; set; }

        /// <summary>Supervisors on duty right now (matched by shift key).</summary>
        public List<PersonConfigDto> Supervisors { get; set; } = new();

        /// <summary>Engineers on duty right now (matched by shift key).</summary>
        public List<PersonConfigDto> Engineers { get; set; } = new();
    }
}