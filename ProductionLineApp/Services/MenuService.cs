using System.Text.Json;
using ProductionLineApp.Models;

namespace ProductionLineApp.Services
{
    public class MenuService
    {
        private readonly AppwriteService _appwrite;

        // Appwrite collection details
        private const string CollectionId = "app_menus";

        // Cached result so we only fetch once per session
        private List<AppMenu>? _cached;

        public MenuService(AppwriteService appwrite)
        {
            _appwrite = appwrite;
        }

        public async Task<List<AppMenu>> GetMenusAsync(List<string>? userRoles = null, CancellationToken ct = default)
        {
            // If cache exists, return it
            if (_cached != null) return _cached;

            try
            {
                var menus = await _appwrite.GetAppMenusAsync(ct);

                // Normalize user roles to handle case-insensitivity
                var normalizedUserRoles = userRoles?.Select(r => r.ToLower()).ToList() ?? new List<string>();

                _cached = menus
                    .Where(m =>
                    {
                        // 1. If the menu is for "All", everyone sees it
                        if (m.AllowedRoles.Any(r => r.Equals("All", StringComparison.OrdinalIgnoreCase)))
                            return true;

                        // 2. Check if there is any overlap between user roles and allowed roles
                        // We use .Intersect().Any() to see if at least one role matches
                        return m.AllowedRoles.Any(allowed =>
                            normalizedUserRoles.Contains(allowed.ToLower()));
                    })
                    .OrderBy(m => m.OrderIndex)
                    .ToList();

                return _cached;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MenuService] Failed to load menus: {ex.Message}");
                return FallbackMenus();
            }
        }

        public void ClearCache() => _cached = null;

        // Hardcoded fallback if Appwrite is unreachable
        private static List<AppMenu> FallbackMenus() => new()
        {
            new AppMenu { Title = "Dashboard", Icon = "overview",  Route = "/overview",  OrderIndex = 1 },
            new AppMenu { Title = "Alerts",    Icon = "alerts",    Route = "/alerts",    OrderIndex = 2 },
            new AppMenu { Title = "Lines",     Icon = "lines",     Route = "/lines",     OrderIndex = 3 },
            new AppMenu { Title = "Settings",  Icon = "settings",  Route = "/settings",  OrderIndex = 4 },
        };
    }
}
