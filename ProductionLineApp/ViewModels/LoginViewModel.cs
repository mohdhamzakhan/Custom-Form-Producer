using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Maui.Controls;
using ProductionLineApp.Services;

namespace ProductionLineApp.ViewModels
{
    public partial class LoginViewModel : ObservableObject
    {
        private readonly AuthService _auth;
        private readonly PushNotificationService _push;
        private readonly AppwriteService _appwrite;

        [ObservableProperty] private string _email = string.Empty;
        [ObservableProperty] private string _password = string.Empty;
        [ObservableProperty] private bool _isLoading;
        [ObservableProperty] private string _errorMessage = string.Empty;
        [ObservableProperty] private bool _hasError;

        public LoginViewModel(AuthService auth, PushNotificationService push, AppwriteService appwrite)
        {
            _auth = auth;
            _push = push;
            _appwrite = appwrite;
        }

        [RelayCommand]
        public async Task LoginAsync()
        {
            if (string.IsNullOrWhiteSpace(Email) || string.IsNullOrWhiteSpace(Password))
            {
                HasError = true;
                ErrorMessage = "Please enter your email and password.";
                return;
            }

            IsLoading = true;
            HasError = false;

            try
            {
                bool success = await _auth.LoginAsync(Email, Password);
                if (success)
                {
                    // 1. Initialize FCM and subscribe to events
                    await _push.InitializeAsync();

                    // 2. Register this device's FCM token with Appwrite
                    var token = await _push.GetTokenAsync();
                    if (!string.IsNullOrEmpty(token))
                        await _appwrite.RegisterPushTokenAsync(token);

                    // Swap root to AppShell first, then reload tabs now that JWT is set
                    var shell = new AppShell();
                    Application.Current!.MainPage = shell;
                    await shell.ReloadTabsAsync();
                }
                else
                {
                    HasError = true;
                    ErrorMessage = "Invalid email or password. Please try again.";
                }
            }
            catch (Exception ex)
            {
                HasError = true;
                ErrorMessage = $"Login failed: {ex.Message}";
            }
            finally
            {
                IsLoading = false;
            }
        }
    }
}