namespace ProductionLineApp.Services
{
    public class AuthService
    {
        private readonly AppwriteService _appwrite;
        private const string JwtKey = "auth_jwt";
        private const string EmailKey = "auth_email";

        public bool IsLoggedIn { get; private set; }
        public string? CurrentEmail { get; private set; }

        public AuthService(AppwriteService appwrite)
        {
            _appwrite = appwrite;

            // Restore saved session
            var savedJwt = Preferences.Get(JwtKey, null as string);
            if (!string.IsNullOrEmpty(savedJwt))
            {
                _appwrite.SetSessionJwt(savedJwt);
                IsLoggedIn = true;
                CurrentEmail = Preferences.Get(EmailKey, null as string);
            }
        }

        public async Task<bool> LoginAsync(string email, string password)
        {
            var jwt = await _appwrite.LoginAsync(email, password);
            if (jwt == null) return false;

            _appwrite.SetSessionJwt(jwt);
            Preferences.Set(JwtKey, jwt);
            Preferences.Set(EmailKey, email);

            IsLoggedIn = true;
            CurrentEmail = email;
            return true;
        }

        public void Logout()
        {
            Preferences.Remove(JwtKey);
            Preferences.Remove(EmailKey);
            IsLoggedIn = false;
            CurrentEmail = null;
        }
    }
}
