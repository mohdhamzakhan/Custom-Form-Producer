using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using ProductionLineApp.Models;
using ProductionLineApp.Services;

namespace ProductionLineApp.ViewModels
{
    public partial class DashboardViewModel : ObservableObject, IDisposable
    {
        private readonly AppwriteService _appwrite;
        private readonly AuthService _authService;

        [ObservableProperty] private bool _isLoading;
        [ObservableProperty] private string _errorMessage = string.Empty;
        [ObservableProperty] private bool _hasError;

        // Stats
        [ObservableProperty] private int _totalAlerts;
        [ObservableProperty] private int _sentAlerts;
        [ObservableProperty] private int _suppressedAlerts;
        [ObservableProperty] private int _failedAlerts;
        [ObservableProperty] private int _activeLines;

        // Recent logs
        [ObservableProperty] private List<NotificationLog> _recentLogs = new();

        // Line statuses
        [ObservableProperty] private List<LineStatus> _lineStatuses = new();

        // Last refresh time
        [ObservableProperty] private string _lastRefreshed = "Never";

        public DashboardViewModel(AppwriteService appwrite, AuthService authService)
        {
            _appwrite = appwrite;
            _authService = authService;

            // ─── CRITICAL FIX ────────────────────────────────────────────────
            // Subscribe to auth changes so the dashboard refreshes 
            // automatically when the user logs in.
            _authService.OnAuthStateChanged += HandleAuthStateChanged;
            // ─────────────────────────────────────────────────────────────────
        }

        private async void HandleAuthStateChanged()
        {
            if (_authService.IsLoggedIn)
            {
                await LoadAsync();
            }
            else
            {
                // Optional: Clear data on logout
                ClearData();
            }
        }

        [RelayCommand]
        public async Task LoadAsync()
        {
            // Don't attempt to load if we aren't logged in
            if (!_authService.IsLoggedIn) return;

            IsLoading = true;
            HasError = false;
            ErrorMessage = string.Empty;

            try
            {
                var statsTask = _appwrite.GetDashboardStatsAsync();
                var recentTask = _appwrite.GetRecentLogsAsync(5);
                var linesTask = _appwrite.GetLineStatusesAsync();

                await Task.WhenAll(statsTask, recentTask, linesTask);

                var stats = statsTask.Result;
                TotalAlerts = stats.TotalAlerts;
                SentAlerts = stats.SentAlerts;
                SuppressedAlerts = stats.SuppressedAlerts;
                FailedAlerts = stats.FailedAlerts;
                ActiveLines = stats.ActiveLines;

                RecentLogs = recentTask.Result;
                LineStatuses = linesTask.Result;

                LastRefreshed = $"Updated {DateTime.Now:HH:mm}";
            }
            catch (Exception ex)
            {
                HasError = true;
                ErrorMessage = $"Failed to load data: {ex.Message}";
            }
            finally
            {
                IsLoading = false;
            }
        }

        private void ClearData()
        {
            TotalAlerts = SentAlerts = SuppressedAlerts = FailedAlerts = ActiveLines = 0;
            RecentLogs = new();
            LineStatuses = new();
            LastRefreshed = "Logged Out";
        }

        public void Dispose()
        {
            // Unsubscribe to prevent memory leaks
            _authService.OnAuthStateChanged -= HandleAuthStateChanged;
        }
    }
}