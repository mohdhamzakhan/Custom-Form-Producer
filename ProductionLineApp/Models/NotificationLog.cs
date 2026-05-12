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

        // Supervisor & Engineer fields (comma-separated when multiple people)
        public string? SupervisorName { get; set; }
        public string? SupervisorEmail { get; set; }
        public string? SupervisorPhone { get; set; }
        public string? EngineerName { get; set; }
        public string? EngineerEmail { get; set; }
        public string? EngineerPhone { get; set; }

        // Button visibility — only show if value present
        public bool HasSupervisorPhone => !string.IsNullOrWhiteSpace(SupervisorPhone);
        public bool HasSupervisorEmail => !string.IsNullOrWhiteSpace(SupervisorEmail);
        public bool HasEngineerPhone => !string.IsNullOrWhiteSpace(EngineerPhone);
        public bool HasEngineerEmail => !string.IsNullOrWhiteSpace(EngineerEmail);
        public bool HasAnySupervisor => HasSupervisorPhone || HasSupervisorEmail;
        public bool HasAnyEngineer => HasEngineerPhone || HasEngineerEmail;

        // Take first entry when multiple are comma-separated
        public string FirstSupervisorPhone => SupervisorPhone?.Split(',')[0].Trim() ?? string.Empty;
        public string FirstSupervisorEmail => SupervisorEmail?.Split(',')[0].Trim() ?? string.Empty;
        public string FirstEngineerPhone => EngineerPhone?.Split(',')[0].Trim() ?? string.Empty;
        public string FirstEngineerEmail => EngineerEmail?.Split(',')[0].Trim() ?? string.Empty;

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
                var diff = DateTime.UtcNow - SentAt;
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
                ? $"{(int)(DateTime.UtcNow - LastActivity.Value).TotalMinutes} min ago"
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