using ProductionLineApp.Models;
using ProductionLineApp.ViewModels;

namespace ProductionLineApp.Views
{
    public partial class NotificationLogsPage : ContentPage
    {
        private readonly NotificationLogsViewModel _vm;

        public NotificationLogsPage()
        {
            InitializeComponent();
            _vm = MauiProgram.Services.GetRequiredService<NotificationLogsViewModel>();
            BindingContext = _vm;
        }

        protected override async void OnAppearing()
        {
            base.OnAppearing();

            // Set default filter on first load
            if (_vm.SelectedStatus == null)
                _vm.SelectedStatus = "All";

            if (!_vm.Logs.Any())
                await _vm.LoadCommand.ExecuteAsync(null);
        }

        private async void OnFilterChanged(object sender, EventArgs e)
        {
            await _vm.LoadCommand.ExecuteAsync(null);
        }

        private async void OnLogSelected(object sender, SelectionChangedEventArgs e)
        {
            if (e.CurrentSelection.FirstOrDefault() is NotificationLog log)
            {
                ((CollectionView)sender).SelectedItem = null;
                await ShowLogDetailAsync(log);
            }
        }

        private async Task ShowLogDetailAsync(NotificationLog log)
        {
            var details = new StringBuilder();
            details.AppendLine($"🏭 Plant: {log.LinePlant}");
            details.AppendLine($"🔑 Line ID: {log.LineId}");
            details.AppendLine($"👤 Recipient: {log.RecipientName}");
            details.AppendLine($"📧 Email: {log.RecipientEmail}");
            details.AppendLine($"📡 Platform: {log.Platform}");
            details.AppendLine($"📊 Status: {log.Status}");
            details.AppendLine($"🕐 Sent: {log.SentAt.ToLocalTime():dd MMM yyyy HH:mm:ss}");

            if (!string.IsNullOrEmpty(log.SuppressReason))
                details.AppendLine($"⏸️ Suppressed: {log.SuppressReason}");

            if (!string.IsNullOrEmpty(log.ErrorMsg))
                details.AppendLine($"❌ Error: {log.ErrorMsg}");

            await DisplayAlert("Alert Details", details.ToString(), "Close");
        }
    }
}
