namespace ProductionLineApp.Models
{
    public class NotificationLog
    {
        public string Id { get; set; } = string.Empty;
        public string LineId { get; set; } = string.Empty;
        public string LinePlant { get; set; } = string.Empty;
        public string RecipientName { get; set; } = string.Empty;
        public string RecipientEmail { get; set; } = string.Empty;
        public string Platform { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? SuppressReason { get; set; }
        public string? ErrorMsg { get; set; }
        public DateTime SentAt { get; set; }

        // Computed display properties
        public string StatusColor => Status switch
        {
            "Sent" => "#4CAF50",
            "Suppressed" => "#FF9800",
            "Failed" => "#F44336",
            _ => "#9E9E9E"
        };

        public string StatusIcon => Status switch
        {
            "Sent" => "✅",
            "Suppressed" => "⏸️",
            "Failed" => "❌",
            _ => "❓"
        };

        public string TimeAgo
        {
            get
            {
                var diff = DateTime.Now - SentAt;
                if (diff.TotalMinutes < 1) return "Just now";
                if (diff.TotalMinutes < 60) return $"{(int)diff.TotalMinutes}m ago";
                if (diff.TotalHours < 24) return $"{(int)diff.TotalHours}h ago";
                return $"{(int)diff.TotalDays}d ago";
            }
        }

        public string FormattedTime => SentAt.ToLocalTime().ToString("dd MMM, HH:mm");
    }

    public class AppwriteListResponse<T>
    {
        public int Total { get; set; }
        public List<T> Documents { get; set; } = new();
    }

    public class AppwriteDocument : NotificationLog
    {
        // Appwrite metadata fields (mapped from $id, $createdAt etc.)
    }

    public class LineStatus
    {
        public string LineId { get; set; } = string.Empty;
        public string PlantName { get; set; } = string.Empty;
        public string LastStatus { get; set; } = "Unknown";
        public DateTime? LastActivity { get; set; }
        public int AlertCount { get; set; }

        public string StatusColor => LastStatus switch
        {
            "Sent" => "#F44336",      // Red = Alert was sent (line was down)
            "Suppressed" => "#FF9800", // Orange = Suppressed
            "OK" => "#4CAF50",         // Green = No recent alerts
            _ => "#9E9E9E"
        };

        public string MinutesSinceActivity =>
            LastActivity.HasValue
                ? $"{(int)(DateTime.Now - LastActivity.Value).TotalMinutes} min ago"
                : "No data";
    }

    public class DashboardStats
    {
        public int TotalAlerts { get; set; }
        public int SentAlerts { get; set; }
        public int SuppressedAlerts { get; set; }
        public int FailedAlerts { get; set; }
        public int ActiveLines { get; set; }
    }
}
