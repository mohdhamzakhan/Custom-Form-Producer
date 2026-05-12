namespace ProductionLineApp.Services
{
    public class AuthService
    {
        private readonly AppwriteService _appwrite;

        public event Action? OnAuthStateChanged;
        private const string JwtKey = "auth_jwt";
        private const string EmailKey = "auth_email";

        public bool IsLoggedIn { get; private set; }
        public string? CurrentEmail { get; private set; }
        public List<string> UserRoles { get; private set; } = new();

        public AuthService(AppwriteService appwrite)
        {
            _appwrite = appwrite;

            // Restore saved session
            var savedJwt = Preferences.Get(JwtKey, null as string);
            if (!string.IsNullOrEmpty(savedJwt))
            {
                _appwrite.SetSessionJwt(savedJwt);
                IsLoggedIn = true;
                CurrentEmail = Preferences.Get("auth_email", "Unknown User");
                var rolesString = Preferences.Get("auth_roles", "User");
                UserRoles = rolesString.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList();
            }
        }

        public async Task<bool> LoginAsync(string email, string password)
        {
            // 1. Create the session
            var jwt = await _appwrite.LoginAsync(email, password);
            if (jwt == null) return false;

            CurrentEmail = email; // Update local state
            Preferences.Set("auth_email", email);

            // 2. IMMEDIATELY set the JWT so the next request is authorized
            _appwrite.SetSessionJwt(jwt);

            // 3. Small delay (Optional but helpful for CookieContainer sync on some Android versions)
            await Task.Delay(100);

            // 4. NOW fetch the labels
            var labels = await _appwrite.GetUserLabelsAsync();

            // 5. Assign Role
            var possibleRoles = new List<string> { "admin", "manager", "engineer" };
            var foundRole = labels.FirstOrDefault(l => possibleRoles.Contains(l.ToLower()));
            UserRoles = await _appwrite.GetUserLabelsAsync();

            // 6. Save State
            Preferences.Set("auth_jwt", jwt);
            Preferences.Set("auth_roles", string.Join(",", UserRoles));
            Preferences.Set("auth_email", email);
            IsLoggedIn = true;

            OnAuthStateChanged?.Invoke();
            return true;
        }

        public void Logout()
        {
            // 1. Clear Service Headers and Cookies
            _appwrite.SignOut();

            // 2. Clear Local Preferences
            Preferences.Remove(JwtKey);
            Preferences.Remove(EmailKey);

            // 3. Reset State
            IsLoggedIn = false;
            CurrentEmail = null;

            // 4. Notify Listeners
            OnAuthStateChanged?.Invoke();
        }
    }
}
