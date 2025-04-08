using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using productionLine.Server.Model;
using System.DirectoryServices.AccountManagement;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace productionLine.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LoginController : ControllerBase
    {
        private readonly JwtSettings _jwtSettings;
        private readonly IConfiguration _configuration;

        public LoginController(IOptions<JwtSettings> jwtSettings, IConfiguration configuration)
        {
            _jwtSettings = jwtSettings.Value;
            _configuration = configuration;
        }

        [HttpPost]
        public IActionResult Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
                return BadRequest("Username and Password must be provided.");

            string domain = _configuration["ADSettings:Domain"]; // Get domain from appsettings.json

            // Authenticate against Active Directory
            using (var context = new PrincipalContext(ContextType.Domain, domain))
            {
                bool isValid = context.ValidateCredentials(request.Username, request.Password);

                if (!isValid)
                    return Unauthorized("Invalid username or password.");

                // Get user principal
                var userPrincipal = UserPrincipal.FindByIdentity(context, request.Username);

                if (userPrincipal == null)
                    return Unauthorized("User not found in AD.");

                var groups = userPrincipal.GetAuthorizationGroups()
                                          .Select(g => g.SamAccountName)
                                          .Where(name => !string.IsNullOrEmpty(name))
                                          .ToList();

                // Create claims
                var claims = new List<Claim>
                {
                    new Claim(ClaimTypes.Name, request.Username),
                    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
                };

                foreach (var group in groups)
                {
                    claims.Add(new Claim(ClaimTypes.Role, group));
                }

                // Create token
                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey));
                var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

                var token = new JwtSecurityToken(
                    issuer: _jwtSettings.Issuer,
                    audience: _jwtSettings.Audience,
                    claims: claims,
                    expires: DateTime.Now.AddHours(_jwtSettings.ExpiryInHours),
                    signingCredentials: creds
                );

                var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

                return Ok(new
                {
                    Token = tokenString,
                    Username = request.Username,
                    Groups = groups
                });
            }
        }
    }
}
