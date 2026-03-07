using System.ComponentModel.DataAnnotations;

namespace productionLine.Server.DTO
{
    public class EmailScheduleCreateDto
    {
        [Required, MaxLength(200)]
        public string Title { get; set; }

        [Required, MaxLength(500)]
        public string Subject { get; set; }

        [Required]
        public string Body { get; set; }

        /// <summary>Once | Daily | Weekly | Monthly | Custom</summary>
        [Required]
        public string OccurrenceType { get; set; }

        public DateTime StartDateTime { get; set; }
        public DateTime? EndDateTime { get; set; }

        /// <summary>Cron expression when OccurrenceType = Custom</summary>
        public string? CronExpression { get; set; }

        /// <summary>Day numbers for Weekly/Monthly (e.g. "1,3,5")</summary>
        public string? RecurrenceDays { get; set; }

        /// <summary>HH:mm UTC (e.g. "09:00")</summary>
        public string? SendTime { get; set; }

        public List<RecipientDto> Recipients { get; set; } = new();
    }

    public class EmailScheduleUpdateDto : EmailScheduleCreateDto
    {
        // inherits everything; controller uses separate id from route
    }

    // ────────────────────────────────────────────────────
    // RECIPIENT
    // ────────────────────────────────────────────────────
    public class RecipientDto
    {
        /// <summary>user | group</summary>
        [Required]
        public string Type { get; set; }

        [Required, MaxLength(200)]
        public string Name { get; set; }

        public string? Email { get; set; }
        public string? AdObjectId { get; set; }

        /// <summary>to | cc | bcc</summary>
        public string RecipientType { get; set; } = "to";
    }

    // ────────────────────────────────────────────────────
    // RESPONSE (list + detail)
    // ────────────────────────────────────────────────────
    public class EmailScheduleListDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Subject { get; set; }
        public string OccurrenceType { get; set; }
        public string Status { get; set; }
        public DateTime StartDateTime { get; set; }
        public DateTime? NextSendAt { get; set; }
        public DateTime? LastSentAt { get; set; }
        public int TotalSentCount { get; set; }
        public int RecipientCount { get; set; }
        public int AttachmentCount { get; set; }
        public string CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class EmailScheduleDetailDto : EmailScheduleListDto
    {
        public string Body { get; set; }
        public DateTime? EndDateTime { get; set; }
        public string? CronExpression { get; set; }
        public string? RecurrenceDays { get; set; }
        public string? SendTime { get; set; }
        public List<RecipientDto> Recipients { get; set; } = new();
        public List<AttachmentDto> Attachments { get; set; } = new();
        public List<EmailScheduleLogDto> RecentLogs { get; set; } = new();
    }

    // ────────────────────────────────────────────────────
    // ATTACHMENT (response only – upload is multipart)
    // ────────────────────────────────────────────────────
    public class AttachmentDto
    {
        public int Id { get; set; }
        public string FileName { get; set; }
        public long FileSizeBytes { get; set; }
        public string? ContentType { get; set; }
        public DateTime UploadedAt { get; set; }
    }

    // ────────────────────────────────────────────────────
    // LOG
    // ────────────────────────────────────────────────────
    public class EmailScheduleLogDto
    {
        public int Id { get; set; }
        public DateTime SentAt { get; set; }
        public string Status { get; set; }
        public int RecipientsTotal { get; set; }
        public int RecipientsSucceeded { get; set; }
        public int RecipientsFailed { get; set; }
        public string? ErrorMessage { get; set; }
    }

    // ────────────────────────────────────────────────────
    // STATUS PATCH (pause / resume / cancel)
    // ────────────────────────────────────────────────────
    public class StatusUpdateDto
    {
        /// <summary>Active | Paused | Completed</summary>
        [Required]
        public string Status { get; set; }
    }

    // ────────────────────────────────────────────────────
    // SEND NOW (ad-hoc trigger)
    // ────────────────────────────────────────────────────
    public class SendNowDto
    {
        public int ScheduleId { get; set; }
    }
}
