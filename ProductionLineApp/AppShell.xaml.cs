using ProductionLineApp.Models;
using ProductionLineApp.Services;
using ProductionLineApp.Views;

namespace ProductionLineApp
{
    public partial class AppShell : Shell
    {
        private readonly MenuService _menuService;
        private readonly AuthService _authService;
        private bool _tabsLoaded = false;

        public AppShell()
        {
            InitializeComponent();
            _menuService = MauiProgram.Services.GetRequiredService<MenuService>();
            _authService = MauiProgram.Services.GetRequiredService<AuthService>();

            // Shell REQUIRES at least one item synchronously — add a single
            // placeholder so the Shell renderer doesn't throw, then replace it.
            MainTabBar.Items.Add(new ShellContent
            {
                Title = "Loading...",
                Route = "loading",
                ContentTemplate = new DataTemplate(() =>
                    MauiProgram.Services.GetRequiredService<DashboardPage>())
            });

            _ = LoadDynamicTabsAsync();
        }

        public async Task ReloadTabsAsync()
        {
            _tabsLoaded = false;
            // When reloading, clear the menu cache so new roles are applied
            _menuService.ClearCache();
            await LoadDynamicTabsAsync();
        }

        private async Task LoadDynamicTabsAsync()
        {
            if (_tabsLoaded) return;

            try
            {
                var roles = _authService.UserRoles;

                // Pass the role to the MenuService
                var menus = await _menuService.GetMenusAsync(roles);

                await MainThread.InvokeOnMainThreadAsync(() =>
                {
                    MainTabBar.Items.Clear();

                    var added = 0;
                    foreach (var menu in menus)
                    {
                        var page = ResolvePageForRoute(menu.RouteKey);
                        if (page == null)
                        {
                            Console.WriteLine($"[AppShell] No page mapped for route '{menu.RouteKey}' — skipping.");
                            continue;
                        }

                        // Capture loop variable for the DataTemplate lambda
                        var capturedPage = page;
                        MainTabBar.Items.Add(new ShellContent
                        {
                            Title = menu.Title,
                            Route = menu.RouteKey,
                            Icon = $"tab_{menu.Icon.ToLowerInvariant()}.png",
                            ContentTemplate = new DataTemplate(() => capturedPage)
                        });
                        added++;
                        Console.WriteLine($"[AppShell] Added tab: {menu.Title} ({menu.RouteKey})");
                    }

                    if (added == 0)
                    {
                        Console.WriteLine("[AppShell] No tabs resolved — falling back to defaults.");
                        AddDefaultTabs();
                    }

                    _tabsLoaded = true;
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AppShell] Dynamic tab load failed: {ex.Message}");
                await MainThread.InvokeOnMainThreadAsync(AddDefaultTabs);
            }
        }

        // ── Route → Page mapping ─────────────────────────────────────────────
        // The key is menu.RouteKey = route field with leading slash stripped.
        private static Page? ResolvePageForRoute(string routeKey) => routeKey switch
        {
            "overview" => MauiProgram.Services.GetRequiredService<DashboardPage>(),
            "alerts" => MauiProgram.Services.GetRequiredService<NotificationLogsPage>(),
            "lines" => MauiProgram.Services.GetRequiredService<LineStatusPage>(),
            "settings" => MauiProgram.Services.GetRequiredService<SettingsPage>(),
            //"config" => MauiProgram.Services.GetRequiredService<SettingsPage>(), // map until ConfigPage exists
            _ => null
        };

        private void AddDefaultTabs()
        {
            MainTabBar.Items.Clear();
            MainTabBar.Items.Add(new ShellContent
            {
                Title = "Overview",
                Route = "overview",
                Icon = "tab_overview.png",
                ContentTemplate = new DataTemplate(() =>
                    MauiProgram.Services.GetRequiredService<DashboardPage>())
            });
            MainTabBar.Items.Add(new ShellContent
            {
                Title = "Settings",
                Route = "settings",
                Icon = "tab_settings.png",
                ContentTemplate = new DataTemplate(() =>
                    MauiProgram.Services.GetRequiredService<SettingsPage>())
            });
        }
    }
}