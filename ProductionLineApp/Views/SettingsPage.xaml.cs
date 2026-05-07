using ProductionLineApp.Services;

namespace ProductionLineApp.Views
{
    public partial class SettingsPage : ContentPage
    {
        private readonly AuthService _auth;

        public SettingsPage()
        {
            InitializeComponent();
            _auth = MauiProgram.Services.GetRequiredService<AuthService>();
        }

        protected override void OnAppearing()
        {
            base.OnAppearing();
            EmailLabel.Text = _auth.CurrentEmail ?? "Unknown";
        }

        private async void OnSignOutClicked(object sender, EventArgs e)
        {
            bool confirmed = await DisplayAlert(
                "Sign Out",
                "Are you sure you want to sign out?",
                "Sign Out", "Cancel");

            if (!confirmed) return;

            _auth.Logout();
            Application.Current!.MainPage = new LoginPage();
        }
    }
}
