using ProductionLineApp.ViewModels;

namespace ProductionLineApp.Views
{
    public partial class LineStatusPage : ContentPage
    {
        private readonly DashboardViewModel _vm;

        public LineStatusPage()
        {
            InitializeComponent();
            _vm = MauiProgram.Services.GetRequiredService<DashboardViewModel>();
            BindingContext = _vm;
        }

        protected override async void OnAppearing()
        {
            base.OnAppearing();
            if (!_vm.LineStatuses.Any())
                await _vm.LoadCommand.ExecuteAsync(null);
        }
    }
}
