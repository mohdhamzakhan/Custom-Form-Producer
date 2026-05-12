using Plugin.Firebase.CloudMessaging;
using Plugin.Firebase.CloudMessaging.EventArgs;

namespace ProductionLineApp.Services
{
    public class PushNotificationService
    {
        private readonly AppwriteService _appwriteService;

        // Add constructor to get your AppwriteService
        public PushNotificationService(AppwriteService appwriteService)
        {
            _appwriteService = appwriteService;
        }
        public async Task InitializeAsync()
        {
            try
            {
                await CrossFirebaseCloudMessaging.Current.CheckIfValidAsync();
                CrossFirebaseCloudMessaging.Current.NotificationReceived += OnNotificationReceived;
                CrossFirebaseCloudMessaging.Current.NotificationTapped += OnNotificationTapped;
                var token = await CrossFirebaseCloudMessaging.Current.GetTokenAsync();
                Console.WriteLine($"[FCM] Initialized. Token: {token}");
                // NEW: Register this token with Appwrite
                if (!string.IsNullOrEmpty(token))
                {
                    await _appwriteService.RegisterPushTokenAsync(token);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[FCM] InitializeAsync error: {ex.Message}");
            }
        }

        

        public async Task<string?> GetTokenAsync()
        {
            try
            {
                await CrossFirebaseCloudMessaging.Current.CheckIfValidAsync();
                return await CrossFirebaseCloudMessaging.Current.GetTokenAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[FCM] GetToken error: {ex.Message}");
                return null;
            }
        }

        private void OnNotificationReceived(object? sender, FCMNotificationReceivedEventArgs e)
        {
            MainThread.BeginInvokeOnMainThread(async () =>
            {
                if (Application.Current?.MainPage != null)
                {
                    await Application.Current.MainPage.DisplayAlert(
                        e.Notification.Title ?? "🚨 Production Alert",
                        e.Notification.Body ?? "A production line requires attention.",
                        "View");
                }
            });
        }

        private void OnNotificationTapped(object? sender, FCMNotificationTappedEventArgs e)
        {
            MainThread.BeginInvokeOnMainThread(async () =>
            {
                if (Shell.Current != null)
                    await Shell.Current.GoToAsync("//alerts");
            });
        }
    }
}
