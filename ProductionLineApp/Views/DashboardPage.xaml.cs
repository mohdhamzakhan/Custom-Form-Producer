using ProductionLineApp.ViewModels;

namespace ProductionLineApp.Views
{
    public partial class DashboardPage : ContentPage
    {
        private readonly DashboardViewModel _vm;

        public DashboardPage()
        {
            InitializeComponent();
            _vm = MauiProgram.Services.GetRequiredService<DashboardViewModel>();
            BindingContext = _vm;
        }

        protected override async void OnAppearing()
        {
            base.OnAppearing();
            await _vm.LoadCommand.ExecuteAsync(null);
        }

        private async void OnViewAllClicked(object sender, EventArgs e)
        {
            await Shell.Current.GoToAsync("//alerts");
        }

        private async void OnCallTapped(object sender, TappedEventArgs e)
        {
            var phone = e.Parameter as string;

            //await DisplayAlert("Phone", phone ?? "NULL", "OK");

            if (string.IsNullOrWhiteSpace(phone))
                return;

            var cleaned = new string(phone
                .Where(c => char.IsDigit(c) || c == '+')
                .ToArray());

            var uri = new Uri($"tel:{cleaned}");

            //await DisplayAlert("URI", uri.ToString(), "OK");

            var canOpen = await Launcher.CanOpenAsync(uri);

            //await DisplayAlert("Can Open", canOpen.ToString(), "OK");

            if (canOpen)
                await Launcher.OpenAsync(uri);
            else
                await DisplayAlert(
                    "Cannot Call",
                    $"Unable to dial {phone} on this device.",
                    "OK");
        }

        private async void OnEmailTapped(object sender, TappedEventArgs e)
        {
            var email = e.Parameter as string;

            //await DisplayAlert("Email", email ?? "NULL", "OK");
            if (string.IsNullOrWhiteSpace(email))
                return;

            try
            {
                await Launcher.OpenAsync($"mailto:{email}");
            }
            catch (Exception)
            {
                await DisplayAlert(
                    "Email Not Supported",
                    "No email application is configured on this device.",
                    "OK");
            }
        }
    }
}
