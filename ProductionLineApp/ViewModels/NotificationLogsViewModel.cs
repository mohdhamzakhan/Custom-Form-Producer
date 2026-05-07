using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using ProductionLineApp.Models;
using ProductionLineApp.Services;

namespace ProductionLineApp.ViewModels
{
    public partial class NotificationLogsViewModel : ObservableObject
    {
        private readonly AppwriteService _appwrite;
        private const int PageSize = 25;

        [ObservableProperty] private bool _isLoading;
        [ObservableProperty] private bool _isLoadingMore;
        [ObservableProperty] private bool _hasError;
        [ObservableProperty] private string _errorMessage = string.Empty;

        [ObservableProperty] private List<NotificationLog> _logs = new();
        [ObservableProperty] private int _totalCount;

        [ObservableProperty] private string? _selectedStatus;
        [ObservableProperty] private string? _selectedLine;

        [ObservableProperty] private bool _canLoadMore;

        private int _currentOffset;

        public List<string> StatusFilters { get; } = new()
        {
            "All", "Sent", "Suppressed", "Failed"
        };

        public NotificationLogsViewModel(AppwriteService appwrite)
        {
            _appwrite = appwrite;
        }

        [RelayCommand]
        public async Task LoadAsync()
        {
            IsLoading = true;
            HasError = false;
            _currentOffset = 0;
            Logs = new();

            try
            {
                var statusFilter = SelectedStatus == "All" ? null : SelectedStatus;
                var (logs, total) = await _appwrite.GetNotificationLogsAsync(
                    limit: PageSize,
                    offset: 0,
                    statusFilter: statusFilter,
                    lineFilter: SelectedLine);

                Logs = logs;
                TotalCount = total;
                CanLoadMore = logs.Count < total;
                _currentOffset = logs.Count;
            }
            catch (Exception ex)
            {
                HasError = true;
                ErrorMessage = $"Error: {ex.Message}";
            }
            finally
            {
                IsLoading = false;
            }
        }

        [RelayCommand]
        public async Task LoadMoreAsync()
        {
            if (IsLoadingMore || !CanLoadMore) return;

            IsLoadingMore = true;
            try
            {
                var statusFilter = SelectedStatus == "All" ? null : SelectedStatus;
                var (moreLogs, _) = await _appwrite.GetNotificationLogsAsync(
                    limit: PageSize,
                    offset: _currentOffset,
                    statusFilter: statusFilter,
                    lineFilter: SelectedLine);

                var updated = new List<NotificationLog>(Logs);
                updated.AddRange(moreLogs);
                Logs = updated;
                _currentOffset += moreLogs.Count;
                CanLoadMore = Logs.Count < TotalCount;
            }
            finally
            {
                IsLoadingMore = false;
            }
        }

        [RelayCommand]
        public async Task ApplyFilterAsync()
        {
            await LoadAsync();
        }
    }
}
