using ProductionLineApp.ViewModels;

namespace ProductionLineApp.Views
{
    public partial class LoginPage : ContentPage
    {
        public LoginPage()
        {
            InitializeComponent();
            BindingContext = MauiProgram.Services.GetRequiredService<LoginViewModel>();
        }
    }
}
