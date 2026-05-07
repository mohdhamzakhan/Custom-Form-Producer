using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace productionLine.Server.Model
{
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Line Configuration
    //    Table: FF_LINE_CONFIG
    //    Engineers and Supervisors stored as JSON CLOBs to allow multiple
    //    people per line without a join table.
    // ─────────────────────────────────────────────────────────────────────────
    [Table("FF_LINE_CONFIG")]
    public class LineConfig
    {
        [Key]
        [Column("ID")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(200)]
        [Column("PLANT")]
        public string Plant { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("FORMID")]
        public string FormId { get; set; } = string.Empty;

        [MaxLength(100)]
        [Column("SHIFT_TEMPLATE_ID")]
        public string? ShiftTemplateId { get; set; }

        // ── Engineers stored as JSON CLOB ──────────────────────────────────
        [Column("ENGINEERS", TypeName = "CLOB")]
        public string? EngineersJson { get; set; }

        [NotMapped]
        public List<PersonConfig> Engineers
        {
            get
            {
                if (string.IsNullOrWhiteSpace(EngineersJson)) return new List<PersonConfig>();
                try { return JsonSerializer.Deserialize<List<PersonConfig>>(EngineersJson) ?? new List<PersonConfig>(); }
                catch { return new List<PersonConfig>(); }
            }
            set => EngineersJson = JsonSerializer.Serialize(value);
        }

        // ── Supervisors stored as JSON CLOB ────────────────────────────────
        [Column("SUPERVISORS", TypeName = "CLOB")]
        public string? SupervisorsJson { get; set; }

        [NotMapped]
        public List<PersonConfig> Supervisors
        {
            get
            {
                if (string.IsNullOrWhiteSpace(SupervisorsJson)) return new List<PersonConfig>();
                try { return JsonSerializer.Deserialize<List<PersonConfig>>(SupervisorsJson) ?? new List<PersonConfig>(); }
                catch { return new List<PersonConfig>(); }
            }
            set => SupervisorsJson = JsonSerializer.Serialize(value);
        }

        [Column("CREATED_AT")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [Column("UPDATED_AT")]
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Notification Recipient
    //    Table: FF_RECIPIENT_CONFIG
    //    Each recipient has its own delay (minutes), platform flags, and an
    //    optional filter list of line IDs they want alerts for.
    // ─────────────────────────────────────────────────────────────────────────
    [Table("FF_RECIPIENT_CONFIG")]
    public class RecipientConfig
    {
        [Key]
        [Column("ID")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(200)]
        [Column("NAME")]
        public string Name { get; set; } = string.Empty;

        [MaxLength(200)]
        [Column("EMAIL")]
        public string? Email { get; set; }

        [MaxLength(50)]
        [Column("PHONE")]
        public string? Phone { get; set; }

        /// <summary>Master on/off switch for this recipient.</summary>
        [Column("ENABLED", TypeName = "NUMBER(1)")]
        public bool Enabled { get; set; } = true;

        /// <summary>Minutes after a line goes down before this recipient is notified.</summary>
        [Column("DELAY_MIN")]
        public int DelayMin { get; set; } = 5;

        /// <summary>Send push via Firebase Cloud Messaging (Android).</summary>
        [Column("ANDROID", TypeName = "NUMBER(1)")]
        public bool Android { get; set; } = true;

        /// <summary>Send push via Apple Push Notification service (iOS).</summary>
        [Column("IOS", TypeName = "NUMBER(1)")]
        public bool Ios { get; set; } = false;

        // ─────────────────────────────────────────────────────────────────────────
        // Device Tokens (Bulletproofed)
        // ─────────────────────────────────────────────────────────────────────────
        [Column("DEVICE_TOKENS", TypeName = "CLOB")]
        public string? DeviceTokensJson { get; set; }

        private List<DeviceToken>? _deviceTokens;

        [NotMapped]
        public List<DeviceToken> DeviceTokens
        {
            get
            {
                if (_deviceTokens != null) return _deviceTokens;

                if (string.IsNullOrWhiteSpace(DeviceTokensJson))
                {
                    _deviceTokens = new List<DeviceToken>();
                    return _deviceTokens;
                }

                try
                {
                    _deviceTokens = JsonSerializer.Deserialize<List<DeviceToken>>(DeviceTokensJson) ?? new List<DeviceToken>();
                    return _deviceTokens;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"JSON ERROR (DeviceTokens): {ex.Message}");
                    _deviceTokens = new List<DeviceToken>();
                    return _deviceTokens;
                }
            }
            set
            {
                _deviceTokens = value;
                DeviceTokensJson = JsonSerializer.Serialize(value);
            }
        }

        // ─────────────────────────────────────────────────────────────────────────
        // Line IDs (Bulletproofed)
        // ─────────────────────────────────────────────────────────────────────────
        [Column("LINE_IDS", TypeName = "CLOB")]
        public string? LineIdsJson { get; set; }

        private List<string>? _lineIds;

        [NotMapped]
        public List<string> LineIds
        {
            get
            {
                if (_lineIds != null) return _lineIds;

                if (string.IsNullOrWhiteSpace(LineIdsJson))
                {
                    _lineIds = new List<string>();
                    return _lineIds;
                }

                try
                {
                    _lineIds = JsonSerializer.Deserialize<List<string>>(LineIdsJson) ?? new List<string>();
                    return _lineIds;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"JSON ERROR (LineIds): {ex.Message}");
                    _lineIds = new List<string>();
                    return _lineIds;
                }
            }
            set
            {
                _lineIds = value;
                LineIdsJson = JsonSerializer.Serialize(value);
            }
        }

        // ─────────────────────────────────────────────────────────────────────────
        // Sync Helper
        // ─────────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Call this before db.SaveChanges() if you modified DeviceTokens or LineIds directly.
        /// </summary>
        public void SyncJsonFields()
        {
            if (_deviceTokens != null)
                DeviceTokensJson = JsonSerializer.Serialize(_deviceTokens);

            if (_lineIds != null)
                LineIdsJson = JsonSerializer.Serialize(_lineIds);
        }

        // ─────────────────────────────────────────────────────────────────────────

        [Column("CREATED_AT")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [Column("UPDATED_AT")]
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Quiet Hours (single-row config — use Upsert by well-known ID)
    //    Table: FF_QUIET_HOURS
    // ─────────────────────────────────────────────────────────────────────────
    [Table("FF_QUIET_HOURS")]
    public class QuietHoursConfig
    {
        [Key]
        [Column("ID")]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>Master toggle for the manual quiet window.</summary>
        [Column("ENABLED", TypeName = "NUMBER(1)")]
        public bool Enabled { get; set; } = false;

        /// <summary>HH:mm format, e.g. "12:00"</summary>
        [MaxLength(5)]
        [Column("START_TIME")]
        public string? Start { get; set; }

        /// <summary>HH:mm format, e.g. "12:30"</summary>
        [MaxLength(5)]
        [Column("END_TIME")]
        public string? End { get; set; }

        /// <summary>
        /// When true the server reads shift break windows from FF_SHIFT_CONFIG
        /// and suppresses notifications during those periods automatically.
        /// </summary>
        [Column("SKIP_BREAKS", TypeName = "NUMBER(1)")]
        public bool SkipBreaks { get; set; } = true;

        [Column("UPDATED_AT")]
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Shift Configuration
    //    Table: FF_SHIFT_CONFIG
    //    One row per shift key (A/B/C). Breaks stored as JSON CLOB.
    // ─────────────────────────────────────────────────────────────────────────
    [Table("FF_SHIFT_CONFIG")]
    public class ShiftConfig
    {
        [Key]
        [Column("ID")]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>Shift identifier: "A", "B", or "C".</summary>
        [Required]
        [MaxLength(10)]
        [Column("SHIFT_KEY")]
        public string Key { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        [Column("NAME")]
        public string Name { get; set; } = string.Empty;

        /// <summary>HH:mm 24-hour format.</summary>
        [MaxLength(5)]
        [Column("START_TIME")]
        public string Start { get; set; } = "00:00";

        /// <summary>HH:mm 24-hour format.</summary>
        [MaxLength(5)]
        [Column("END_TIME")]
        public string End { get; set; } = "00:00";

        [Column("BREAKS", TypeName = "CLOB")]
        public string? BreaksJson { get; set; }

        [NotMapped]
        public List<BreakConfig> Breaks
        {
            get
            {
                if (string.IsNullOrWhiteSpace(BreaksJson)) return new List<BreakConfig>();
                try { return JsonSerializer.Deserialize<List<BreakConfig>>(BreaksJson) ?? new List<BreakConfig>(); }
                catch { return new List<BreakConfig>(); }
            }
            set => BreaksJson = JsonSerializer.Serialize(value);
        }

        [Column("UPDATED_AT")]
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Notification Log  (audit trail — do not delete rows, append only)
    //    Table: FF_NOTIFICATION_LOG
    // ─────────────────────────────────────────────────────────────────────────
    [Table("FF_NOTIFICATION_LOG")]
    public class NotificationLog
    {
        [Key]
        [Column("ID")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("LINE_ID")]
        public string LineId { get; set; } = string.Empty;

        [MaxLength(200)]
        [Column("LINE_PLANT")]
        public string LinePlant { get; set; } = string.Empty;

        [Column("RECIPIENT_ID")]
        public Guid RecipientId { get; set; }

        [MaxLength(200)]
        [Column("RECIPIENT_NAME")]
        public string RecipientName { get; set; } = string.Empty;

        /// <summary>FCM or APNs.</summary>
        [MaxLength(20)]
        [Column("PLATFORM")]
        public string Platform { get; set; } = string.Empty;

        /// <summary>Sent | Suppressed | Failed</summary>
        [MaxLength(20)]
        [Column("STATUS")]
        public string Status { get; set; } = "Sent";

        /// <summary>Break name or "QuietHours" when Status = Suppressed.</summary>
        [MaxLength(100)]
        [Column("SUPPRESS_REASON")]
        public string? SuppressReason { get; set; }

        [Column("SENT_AT")]
        public DateTime SentAt { get; set; } = DateTime.Now;

        [MaxLength(500)]
        [Column("ERROR_MSG")]
        public string? ErrorMsg { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Nested / value objects (serialized into CLOB columns, no own tables)
    // ─────────────────────────────────────────────────────────────────────────

    public class PersonConfig
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("phone")]
        public string Phone { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        /// <summary>"A", "B", or "C"</summary>
        [JsonPropertyName("shift")]
        public string Shift { get; set; } = "A";
    }

    public class BreakConfig
    {
        [JsonPropertyName("id")]
        public long? Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        /// <summary>HH:mm 24-hour format.</summary>
        [JsonPropertyName("start")]
        public string Start { get; set; } = "00:00";

        /// <summary>HH:mm 24-hour format.</summary>
        [JsonPropertyName("end")]
        public string End { get; set; } = "00:00";
    }

    public class DeviceToken
    {
        [JsonPropertyName("token")]
        public string Token { get; set; } = string.Empty;

        /// <summary>"android" or "ios"</summary>
        [JsonPropertyName("platform")]
        public string Platform { get; set; } = "android";

        [JsonPropertyName("registeredAt")]
        public DateTime RegisteredAt { get; set; } = DateTime.Now;
    }
}