using Microsoft.Extensions.Logging;
using Microsoft.Maui.LifecycleEvents;
using Plugin.Firebase.CloudMessaging;
using ProductionLineApp.Services;
using ProductionLineApp.ViewModels;
using ProductionLineApp.Views;
#if IOS
using Plugin.Firebase.Core.Platforms.iOS;
#elif ANDROID
using Plugin.Firebase.Core.Platforms.Android;
#endif

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
                .RegisterFirebaseServices()
                .ConfigureFonts(fonts =>
                {
                    fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                    fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
                });

            // ── Services ───────────────────────────────────────────────────────
            builder.Services.AddSingleton<AppwriteService>();
            builder.Services.AddSingleton<AuthService>();
            builder.Services.AddSingleton<MenuService>();
            builder.Services.AddSingleton<PushNotificationService>();

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

        private static MauiAppBuilder RegisterFirebaseServices(this MauiAppBuilder builder)
        {
            builder.ConfigureLifecycleEvents(events =>
            {
#if IOS
                events.AddiOS(iOS => iOS.WillFinishLaunching((_, __) =>
                {
                    CrossFirebase.Initialize();
                    FirebaseCloudMessagingImplementation.Initialize();
                    return false;
                }));
#elif ANDROID
                events.AddAndroid(android => android.OnCreate((activity, _) =>
                {
                    CrossFirebase.Initialize(activity, () => activity);
                }));
#endif
            });
            return builder;
        }
    }
}
