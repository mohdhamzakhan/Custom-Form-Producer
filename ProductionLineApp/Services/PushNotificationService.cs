using Plugin.Firebase.CloudMessaging;
using Plugin.Firebase.CloudMessaging.EventArgs;

namespace ProductionLineApp.Services
{
    /// <summary>
    /// Subscribes to Firebase Cloud Messaging events forwarded by Appwrite.
    /// Handles both foreground display and notification-tap navigation.
    /// </summary>
    public class PushNotificationService
    {
        private readonly IFirebaseCloudMessaging _fcm;

        public PushNotificationService(IFirebaseCloudMessaging fcm)
        {
            _fcm = fcm;
        }

        public async Task InitializeAsync()
        {
            // Subscribe to foreground messages
            CrossFirebaseCloudMessaging.Current.NotificationReceived += OnNotificationReceived;

            // Subscribe to notification taps (app opened via notification)
            CrossFirebaseCloudMessaging.Current.NotificationTapped += OnNotificationTapped;

            // Get the FCM token (Appwrite will use this to send pushes to this device)
            var token = await CrossFirebaseCloudMessaging.Current.GetTokenAsync();
            Console.WriteLine($"[FCM] Device token: {token}");
        }

        private void OnNotificationReceived(object? sender, FCMNotificationReceivedEventArgs e)
        {
            MainThread.BeginInvokeOnMainThread(async () =>
            {
                // Show in-app banner when app is in foreground
                if (Application.Current?.MainPage != null)
                {
                    await Application.Current.MainPage.DisplayAlert(
                        e.Notification.Title ?? "Production Alert",
                        e.Notification.Body ?? "A production line requires attention.",
                        "View");
                }
            });
        }

        private void OnNotificationTapped(object? sender, FCMNotificationTappedEventArgs e)
        {
            MainThread.BeginInvokeOnMainThread(async () =>
            {
                // Navigate to the alerts tab when user taps a notification
                if (Shell.Current != null)
                    await Shell.Current.GoToAsync("//alerts");
            });
        }
    }
}
