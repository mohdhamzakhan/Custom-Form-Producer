using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using ProductionLineApp.Services;

namespace ProductionLineApp.ViewModels
{
    public partial class LoginViewModel : ObservableObject
    {
        private readonly AuthService _auth;

        [ObservableProperty] private string _email = string.Empty;
        [ObservableProperty] private string _password = string.Empty;
        [ObservableProperty] private bool _isLoading;
        [ObservableProperty] private string _errorMessage = string.Empty;
        [ObservableProperty] private bool _hasError;

        public LoginViewModel(AuthService auth)
        {
            _auth = auth;
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
                    // Swap the root page to AppShell — Shell.Current is null until this happens
                    Application.Current!.MainPage = new AppShell();
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