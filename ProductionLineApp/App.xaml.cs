using ProductionLineApp.Converters;
using ProductionLineApp.Services;
using ProductionLineApp.Views;

namespace ProductionLineApp
{
    public partial class App : Application
    {
        private readonly AuthService _auth;

        public App(AuthService auth)
        {
            InitializeComponent();
            _auth = auth;

            // Register value converters so all pages can reference them by key
            Resources.Add("InverseBoolConverter", new InverseBoolConverter());
            Resources.Add("ZeroToBoolConverter", new ZeroToBoolConverter());
            Resources.Add("NullOrEmptyToBoolConverter", new NullOrEmptyToBoolConverter());
            Resources.Add("StatusToColorConverter", new StatusToColorConverter());
        }

        protected override Window CreateWindow(IActivationState? activationState)
        {
            Page startPage = _auth.IsLoggedIn
                ? (Page)new AppShell()
                : new LoginPage();

            return new Window(startPage);
        }
    }
}
