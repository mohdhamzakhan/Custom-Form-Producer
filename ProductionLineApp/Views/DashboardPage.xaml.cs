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
    }
}
