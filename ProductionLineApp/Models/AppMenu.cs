namespace ProductionLineApp.Models
{
    public class AppMenu
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;   // e.g. "overview", "alerts"
        public string Route { get; set; } = string.Empty;  // e.g. "/overview", "/alerts"
        public int OrderIndex { get; set; }
        public List<string> AllowedRoles { get; set; } = new();

        // Normalised route key (strip leading slash, lower)
        public string RouteKey => Route.TrimStart('/').ToLowerInvariant();

        // Map icon string → emoji fallback (used when no .png asset exists)
        public string IconEmoji => Icon.ToLowerInvariant() switch
        {
            "overview" or "dashboard" => "📊",
            "alerts" or "bell" => "🔔",
            "lines" or "factory" => "🏭",
            "settings" or "gear" => "⚙️",
            "profile" or "person" => "👤",
            "reports" or "chart" => "📈",
            _ => "📋"
        };
    }
}
