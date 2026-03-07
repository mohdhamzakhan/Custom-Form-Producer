using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace productionLine.Server.Model
{
    [Table("FF_EMAIL_SCHEDULE")]
    public class EmailSchedule
    {
        [Key]
        [Column("ID")]
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        [Column("TITLE")]
        [JsonPropertyName("title")]
        public string Title { get; set; }

        [Required]
        [MaxLength(500)]
        [Column("SUBJECT")]
        [JsonPropertyName("subject")]
        public string Subject { get; set; }

        [Required]
        [Column("BODY", TypeName = "CLOB")]
        [JsonPropertyName("body")]
        public string Body { get; set; }

        // ─────────────────────────────
        // Recurrence / Timing
        // ─────────────────────────────

        [Required]
        [MaxLength(20)]
        [Column("OCCURRENCE_TYPE")]
        [JsonPropertyName("occurrenceType")]
        public string OccurrenceType { get; set; }   // Once | Daily | Weekly | Monthly | Custom

        [Column("START_DATETIME")]
        [JsonPropertyName("startDateTime")]
        public DateTime StartDateTime { get; set; }

        [Column("END_DATETIME")]
        [JsonPropertyName("endDateTime")]
        public DateTime? EndDateTime { get; set; }

        [MaxLength(100)]
        [Column("CRON_EXPRESSION")]
        [JsonPropertyName("cronExpression")]
        public string? CronExpression { get; set; }

        [MaxLength(100)]
        [Column("RECURRENCE_DAYS")]
        [JsonPropertyName("recurrenceDays")]
        public string? RecurrenceDays { get; set; }

        [MaxLength(5)]
        [Column("SEND_TIME")]
        [JsonPropertyName("sendTime")]
        public string? SendTime { get; set; }

        // ─────────────────────────────
        // Status & Audit
        // ─────────────────────────────

        [MaxLength(20)]
        [Column("STATUS")]
        [JsonPropertyName("status")]
        public string Status { get; set; } = "Active";

        [Column("LAST_SENT_AT")]
        public DateTime? LastSentAt { get; set; }

        [Column("NEXT_SEND_AT")]
        public DateTime? NextSendAt { get; set; }

        [Column("TOTAL_SENT_COUNT")]
        public int TotalSentCount { get; set; } = 0;

        [Required]
        [MaxLength(100)]
        [Column("CREATED_BY")]
        public string CreatedBy { get; set; }

        [Column("CREATED_AT")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("UPDATED_AT")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(100)]
        [Column("UPDATED_BY")]
        public string? UpdatedBy { get; set; }

        // ─────────────────────────────
        // Navigation
        // ─────────────────────────────

        public ICollection<EmailScheduleRecipient> Recipients { get; set; } = new List<EmailScheduleRecipient>();
        public ICollection<EmailScheduleAttachment> Attachments { get; set; } = new List<EmailScheduleAttachment>();
        public ICollection<EmailScheduleLog> Logs { get; set; } = new List<EmailScheduleLog>();
    }

    [Table("FF_EMAIL_SCHEDULE_LOG")]
    public class EmailScheduleLog
    {
        [Key]
        [Column("ID")]
        public int Id { get; set; }

        [Column("EMAIL_SCHEDULE_ID")]
        public int EmailScheduleId { get; set; }

        [ForeignKey(nameof(EmailScheduleId))]
        public EmailSchedule EmailSchedule { get; set; }

        [Column("SENT_AT")]
        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        [MaxLength(20)]
        [Column("STATUS")]
        public string Status { get; set; }   // Success | Failed | PartialFailure

        [Column("RECIPIENTS_TOTAL")]
        public int RecipientsTotal { get; set; }

        [Column("RECIPIENTS_SUCCEEDED")]
        public int RecipientsSucceeded { get; set; }

        [Column("RECIPIENTS_FAILED")]
        public int RecipientsFailed { get; set; }

        [Column("ERROR_MESSAGE", TypeName = "CLOB")]
        public string? ErrorMessage { get; set; }

        [Column("RECIPIENTS_JSON", TypeName = "CLOB")]
        public string? RecipientsJson { get; set; }
    }

    [Table("FF_EMAIL_SCHEDULE_RECIPIENT")]
    public class EmailScheduleRecipient
    {
        [Key]
        [Column("ID")]
        public int Id { get; set; }

        [Column("EMAIL_SCHEDULE_ID")]
        public int EmailScheduleId { get; set; }

        [ForeignKey(nameof(EmailScheduleId))]
        public EmailSchedule EmailSchedule { get; set; }

        [Required]
        [MaxLength(10)]
        [Column("TYPE")]
        [JsonPropertyName("type")]
        public string Type { get; set; }   // user | group

        [Required]
        [MaxLength(200)]
        [Column("NAME")]
        [JsonPropertyName("name")]
        public string Name { get; set; }

        [MaxLength(200)]
        [Column("EMAIL")]
        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [MaxLength(100)]
        [Column("AD_OBJECT_ID")]
        public string? AdObjectId { get; set; }

        [MaxLength(10)]
        [Column("RECIPIENT_TYPE")]
        [JsonPropertyName("recipientType")]
        public string RecipientType { get; set; } = "to";  // to | cc | bcc
    }

    [Table("FF_EMAIL_SCHEDULE_ATTACHMENT")]
    public class EmailScheduleAttachment
    {
        [Key]
        [Column("ID")]
        public int Id { get; set; }

        [Column("EMAIL_SCHEDULE_ID")]
        public int EmailScheduleId { get; set; }

        [ForeignKey(nameof(EmailScheduleId))]
        public EmailSchedule EmailSchedule { get; set; }

        [Required]
        [MaxLength(255)]
        [Column("FILE_NAME")]
        public string FileName { get; set; }

        [Required]
        [MaxLength(500)]
        [Column("FILE_PATH")]
        public string FilePath { get; set; }

        [MaxLength(100)]
        [Column("CONTENT_TYPE")]
        public string? ContentType { get; set; }

        [Column("FILE_SIZE_BYTES")]
        public long FileSizeBytes { get; set; }

        [Column("UPLOADED_AT")]
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}