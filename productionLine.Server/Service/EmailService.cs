using System.Net;
using System.Net.Mail;

namespace productionLine.Server.Service
{
    public interface IEmailService
    {
        Task SendEmailAsync(string toEmail, string subject, string body);
    }
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            var smtpClient = new SmtpClient(_configuration["Email:Host"])
            {
                Port = int.Parse(_configuration["Email:Port"]),
                EnableSsl = bool.Parse(_configuration["Email:EnableSsl"]),
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false
            };

            // Only use credentials if provided
            var username = _configuration["Email:Username"];
            var password = _configuration["Email:Password"];

            if (!string.IsNullOrWhiteSpace(username))
            {
                smtpClient.Credentials = new NetworkCredential(username, password);
            }

            var mailMessage = new MailMessage
            {
                From = new MailAddress(
                    _configuration["Email:FromEmail"],
                    _configuration["Email:FromName"]
                ),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };

            mailMessage.To.Add(toEmail);

            await smtpClient.SendMailAsync(mailMessage);
        }
    }
}
