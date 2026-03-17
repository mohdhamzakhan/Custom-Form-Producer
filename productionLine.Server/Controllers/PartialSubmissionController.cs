// Controllers/PartialSubmissionController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using productionLine.Server.DTO;
using productionLine.Server.Model;
using System.Net;
using System.Net.Mail;
using System.Text.Json;

namespace productionLine.Server.Controllers
{
    [Route("api/partial-submissions")]
    [ApiController]
    public class PartialSubmissionController : ControllerBase
    {
        private readonly FormDbContext _context;
        private readonly IConfiguration _config;

        public PartialSubmissionController(FormDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        // ─────────────────────────────────────────────
        // POST: Create a partial submission & email the second filler
        // ─────────────────────────────────────────────
        [HttpPost]
        public async Task<IActionResult> CreatePartialSubmission(
            [FromBody] CreatePartialSubmissionDto dto)
        {
            var form = await _context.Forms.FindAsync(dto.FormId);
            if (form == null)
                return NotFound("Form not found");

            var token = Guid.NewGuid().ToString("N"); // clean token

            var partial = new PartialSubmission
            {
                FormId = dto.FormId,
                Token = token,
                AssignedToEmail = dto.AssignedToEmail,
                AssignedToName = dto.AssignedToName,
                FilledBy = dto.FilledBy,
                FilledDataJson = JsonSerializer.Serialize(dto.FilledData),
                FilledFieldsJson = JsonSerializer.Serialize(dto.FilledFieldIds),
                Status = "Pending",
                CreatedAt = DateTime.Now
            };

            _context.PartialSubmissions.Add(partial);
            await _context.SaveChangesAsync();

            // Send email to second filler
            await SendPartialFormEmail(
                dto.AssignedToEmail,
                dto.AssignedToName ?? dto.AssignedToEmail,
                form.Name,
                token,
                dto.FilledBy ?? "A colleague"
            );

            return Ok(new
            {
                message = "Partial submission created. Email sent to second filler.",
                token = token,
                id = partial.Id
            });
        }

        // ─────────────────────────────────────────────
        // GET: Load partial submission by token (for second filler)
        // ─────────────────────────────────────────────
        [HttpGet("token/{token}")]
        public async Task<IActionResult> GetByToken(string token)
        {
            Console.WriteLine($"Token received: '{token}'");
            Console.WriteLine($"Total partials in DB: {await _context.PartialSubmissions.CountAsync()}");

            var partial = await _context.PartialSubmissions
                .Include(p => p.Form)
                .FirstOrDefaultAsync(p => p.Token == token);

            Console.WriteLine($"Found: {partial != null}");

            if (partial == null)
                return NotFound("Invalid or expired token");

            if (partial.Status == "Completed")
                return BadRequest("This partial submission has already been completed.");

            return Ok(new PartialSubmissionStatusDto
            {
                Id = partial.Id,
                Token = partial.Token,
                FormId = partial.FormId,
                AssignedToEmail = partial.AssignedToEmail,
                Status = partial.Status,
                CreatedAt = partial.CreatedAt,
                FilledData = JsonSerializer.Deserialize<Dictionary<string, string>>(partial.FilledDataJson ?? "{}"),
                FilledFieldIds = JsonSerializer
                    .Deserialize<List<string>>(partial.FilledFieldsJson ?? "[]")
            });
        }

        // ─────────────────────────────────────────────
        // POST: Complete partial submission (second filler submits)
        // Merges both halves → creates FormSubmission → triggers approval
        // ─────────────────────────────────────────────
        [HttpPost("complete")]
        public async Task<IActionResult> CompletePartialSubmission(
            [FromBody] CompletePartialSubmissionDto dto)
        {
            var partial = await _context.PartialSubmissions
                .Include(p => p.Form)
                    .ThenInclude(f => f.Approvers)
                .FirstOrDefaultAsync(p => p.Token == dto.Token);

            if (partial == null)
                return NotFound("Invalid token");

            if (partial.Status == "Completed")
                return BadRequest("Already completed");

            // Merge first-filler data + second-filler data
            var firstData = JsonSerializer
                .Deserialize<Dictionary<string, string>>(partial.FilledDataJson ?? "{}");

            var merged = new Dictionary<string, string>(firstData);
            foreach (var kv in dto.RemainingData)
                merged[kv.Key] = kv.Value; // second filler adds/overwrites remaining

            // Build FormSubmission
            var submission = new FormSubmission
            {
                FormId = partial.FormId,
                SubmittedAt = DateTime.Now,
                SubmittedBy = partial.AssignedToEmail,
                Status = "Submitted",
                SubmissionData = merged.Select(kv => new FormSubmissionData
                {
                    FieldLabel = kv.Key,
                    FieldValue = kv.Value
                }).ToList(),
                Approvals = new List<FormApproval>()
            };

            _context.FormSubmissions.Add(submission);
            await _context.SaveChangesAsync();

            // Create approval records
            var approvers = partial.Form?.Approvers ?? new List<FormApprover>();
            if (!approvers.Any())
            {
                _context.FormApprovals.Add(new FormApproval
                {
                    FormSubmissionId = submission.Id,
                    ApprovalLevel = 0,
                    ApproverId = 0,
                    ApproverName = "System Approval",
                    Status = "Approved",
                    Comments = "Auto Approved",
                    ApprovedAt = DateTime.Now
                });
            }
            else
            {
                foreach (var approver in approvers)
                {
                    _context.FormApprovals.Add(new FormApproval
                    {
                        FormSubmissionId = submission.Id,
                        ApprovalLevel = approver.Level,
                        ApproverId = 1,
                        ApproverName = approver.Name,
                        Status = "Pending"
                    });
                }
            }

            // Mark partial as done
            partial.Status = "Completed";
            partial.CompletedAt = DateTime.Now;
            partial.SubmissionId = submission.Id;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Form completed successfully and sent for approval.",
                submissionId = submission.Id
            });
        }

        // ─────────────────────────────────────────────
        // GET: Check access to form (enforce AllowedtoAccess)
        // ─────────────────────────────────────────────
        [HttpGet("check-access/{formId}")]
        public async Task<IActionResult> CheckFormAccess(
            int formId, [FromQuery] string userName)
        {
            var form = await _context.Forms
                .Include(f => f.AllowedtoAccess)
                .FirstOrDefaultAsync(f => f.Id == formId);

            if (form == null) return NotFound();

            // No restrictions → everyone allowed
            if (!form.AllowedtoAccess.Any())
                return Ok(new { allowed = true });

            var allowed = form.AllowedtoAccess.Any(a =>
                a.Name.ToLower() == userName.ToLower() ||
                a.Email.ToLower() == userName.ToLower());

            return Ok(new { allowed });
        }

        // ─────────────────────────────────────────────
        // Private: Send email via SMTP
        // ─────────────────────────────────────────────
        private async Task SendPartialFormEmail(
            string toEmail, string toName,
            string formName, string token, string filledBy)
        {
            try
            {
                var smtpHost = _config["SmtpSettings:Host"] ?? "smtp.gmail.com";
                var smtpPort = int.Parse(_config["SmtpSettings:Port"] ?? "587");
                var smtpUser = _config["SmtpSettings:Username"];
                var smtpPass = _config["SmtpSettings:Password"];
                var appUrl = _config["AppUrl"] ?? "http://localhost:55866";
                var fromEmail = _config["SmtpSettings:FromEmail"] ?? "logs@meai-india.com";
                var smtpEnableSSL = _config["SmtpSettings:EnableSsl"] ?? "false";

                // Link for second filler — add this route in your React Router
                var link = $"{appUrl}/form/complete/{token}";

                //using var client = new SmtpClient(smtpHost, smtpPort)
                //{
                //    Credentials = new NetworkCredential(smtpUser, smtpPass),
                //    EnableSsl = false
                //};

                using var client = new SmtpClient(smtpHost, smtpPort)
                {
                    EnableSsl = Convert.ToBoolean(smtpEnableSSL),
                    Credentials = new NetworkCredential(smtpUser, smtpPass),
                    Timeout = 30_000,
                };

                var body = $@"
                    <html><body>
                    <h2>Action Required: Complete a Form</h2>
                    <p>Hello {toName},</p>
                    <p><strong>{filledBy}</strong> has partially filled the form 
                       <strong>'{formName}'</strong> and requires you to complete it.</p>
                    <p>Fields already filled are <strong>locked</strong> and cannot be changed.</p>
                    <br/>
                    <a href='{link}' style='
                        background:#2563eb;color:white;padding:12px 24px;
                        border-radius:6px;text-decoration:none;font-weight:bold;
                    '>Complete the Form</a>
                    <br/><br/>
                    <p style='color:gray;font-size:12px;'>
                        This link is unique to you. Do not share it.
                    </p>
                    </body></html>";

                var mail = new MailMessage
                {
                    From = new MailAddress(fromEmail!, "Form System"),
                    Subject = $"Action Required: Complete '{formName}'",
                    Body = body,
                    IsBodyHtml = true
                };
                mail.To.Add(toEmail);

                await client.SendMailAsync(mail);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Email failed: {ex.Message}");
                // Don't throw — form was saved, email is best-effort
            }
        }

        [HttpGet("test")]
        public IActionResult Test()
        {
            return Ok(new { message = "PartialSubmission controller is working" });
        }
    }
}