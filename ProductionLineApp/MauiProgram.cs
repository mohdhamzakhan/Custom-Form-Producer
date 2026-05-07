using Microsoft.Extensions.Logging;
using ProductionLineApp.Services;
using ProductionLineApp.ViewModels;
using ProductionLineApp.Views;

namespace ProductionLineApp
{
    public static class MauiProgram
    {
        // Expose service provider for code-behind resolving where constructor injection isn't available
        public static IServiceProvider Services { get; private set; } = null!;

        public static MauiApp CreateMauiApp()
        {
            var builder = MauiApp.CreateBuilder();

            builder
                .UseMauiApp<App>()
                .ConfigureFonts(fonts =>
                {
                    fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                    fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
                });

            // ── Services ───────────────────────────────────────────────────────
            builder.Services.AddSingleton<AppwriteService>();
            builder.Services.AddSingleton<AuthService>();

            // ── ViewModels ─────────────────────────────────────────────────────
            builder.Services.AddSingleton<DashboardViewModel>();
            builder.Services.AddSingleton<NotificationLogsViewModel>();
            builder.Services.AddTransient<LoginViewModel>();

            // ── Pages ──────────────────────────────────────────────────────────
            builder.Services.AddTransient<LoginPage>();
            builder.Services.AddTransient<DashboardPage>();
            builder.Services.AddTransient<NotificationLogsPage>();
            builder.Services.AddTransient<LineStatusPage>();
            builder.Services.AddTransient<SettingsPage>();
            builder.Services.AddSingleton<App>();

#if DEBUG
            builder.Logging.AddDebug();
#endif

            var app = builder.Build();
            Services = app.Services;
            return app;
        }
    }
}
