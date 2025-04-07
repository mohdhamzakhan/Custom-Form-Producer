using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using productionLine.Server.DTO;
using productionLine.Server.Model;
using System.DirectoryServices.AccountManagement;
using System.Runtime.Versioning;

namespace productionLine.Server.Controllers
{
    [Route("api/forms")]
    [ApiController]
    public class FormController : ControllerBase
    {
        private readonly FormDbContext _context;
        public FormController(FormDbContext context)
        {
            _context = context;
        }

        // ✅ Save a new form (with unique link)
        [HttpPost]
        public async Task<IActionResult> CreateForm([FromBody] Form form)
        {
            if (form == null)
            {
                return BadRequest("Form data is required.");
            }

            if (string.IsNullOrWhiteSpace(form.Name) || string.IsNullOrWhiteSpace(form.FormLink))
            {
                return BadRequest("Name and FormLink are required.");
            }

            _context.Forms.Add(form);
            await _context.SaveChangesAsync();

            return Ok(new { formLink = form.FormLink });
        }

        // ✅ Get form by ID
        [HttpGet("{id}")]
        public async Task<IActionResult> GetForm(int id)
        {
            var form = await _context.Forms.Include(f => f.Fields).FirstOrDefaultAsync(f => f.Id == id);
            if (form == null)
                return NotFound("Form not found.");

            return Ok(form);
        }

        [HttpGet("link/{formLink}")]
        public async Task<IActionResult> GetFormByLink(string formLink)
        {
            var form = await _context.Forms
                .Include(f => f.Fields) // Load related fields
                .ThenInclude(field => field.RemarkTriggers) // Load RemarkTriggers for each field
                .FirstOrDefaultAsync(f => f.FormLink == formLink);

            if (form == null)
                return NotFound("Form not found.");

            // Map to DTO
            var formDto = new FormDto
            {
                Id = form.Id,
                FormLink = form.FormLink,
                Name = form.Name, // Include form name
                Fields = form.Fields.Select(f => new FieldDto
                {
                    Id = f.Id,
                    Name = form.Name, // Use form's name directly
                    Type = f.Type,
                    Label = f.Label,
                    Options = f.Options,
                    Required = f.Required,
                    Width = f.Width,
                    RequireRemarks = f.RequiresRemarks,
                    IsDecimal = f.Decimal,
                    Max = f.Max,
                    Min = f.Min,
                    RemarkTriggers = f.RemarkTriggers.Select(rt => new RemarkTriggerDto
                    {
                        Id = rt.Id,
                        Operator = rt.Operator,
                        Value = rt.Value
                    }).ToList()
                }).ToList()
            };

            return Ok(formDto);
        }



        [HttpPost("{formId}/submit")]
        public async Task<IActionResult> SubmitForm(int formId, [FromBody] FormSubmissionDTO submissionDTO)
        {
            if (formId != submissionDTO.FormId)
            {
                return BadRequest("Form ID in URL does not match the one in submission data");
            }

            if (submissionDTO.SubmissionData == null || !submissionDTO.SubmissionData.Any())
            {
                return BadRequest("No form data provided");
            }

            // Create the form submission entity
            var formSubmission = new FormSubmission
            {
                FormId = submissionDTO.FormId,
                SubmittedAt = DateTime.Now,
                SubmissionData = new List<FormSubmissionData>()
            };

            // Add each field data and link it to the form submission
            foreach (var data in submissionDTO.SubmissionData)
            {
                formSubmission.SubmissionData.Add(new FormSubmissionData
                {
                    FieldLabel = data.FieldLabel,
                    FieldValue = data.FieldValue,
                    FormSubmission = formSubmission  // Set the navigation property
                });
            }

            // Add to database
            _context.FormSubmissions.Add(formSubmission);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                id = formSubmission.Id,
                message = "Form submitted successfully"
            });
        }
        [HttpGet("GetALLForms")]
        public async Task<IActionResult> GetAllForms()
        {
            var forms = await _context.Forms.ToListAsync();
            return Ok(forms);
        }

        [HttpGet("GetALLForms/{submissionId}")]
        public async Task<IActionResult> GetAllForms(int submissionId)
        {
            var forms = await _context.Forms.FirstOrDefaultAsync(x => x.Id.Equals(submissionId));
            if (forms == null)
            {
                return NotFound("Form not found.");
            }

            return Ok(forms);
        }


        [HttpGet("{formId}/submissions")]
        public async Task<ActionResult<IEnumerable<FormSubmission>>> GetFormSubmissions(int formId)
        {
            var form = await _context.Forms.FindAsync(formId);
            if (form == null)
            {
                return NotFound();
            }

            var submissions = await _context.FormSubmissions
                .Where(s => s.FormId == formId)
                .ToListAsync();

            return Ok(submissions);
        }

        [HttpGet("submissions/{submissionId}")]
        public async Task<ActionResult> GetSubmission(int submissionId)
        {
            try
            {
                var submission = await _context.FormSubmissions
                    .Include(s => s.SubmissionData)
                    .FirstOrDefaultAsync(s => s.Id == submissionId);

                if (submission == null)
                {
                    return NotFound($"Submission with ID {submissionId} not found");
                }

                var form = await _context.Forms
                    .Include(f => f.Fields)
                    .FirstOrDefaultAsync(f => f.Id == submission.FormId);

                return Ok(new
                {
                    submission,
                    formDefinition = form
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
        [SupportedOSPlatform ("windows")]
        [HttpGet("ad-search")]
        public async Task<IActionResult> SearchActiveDirectory([FromQuery] string term)
        {
            try
            {
             var results = new List<object>();

                using (var context = new PrincipalContext(ContextType.Domain))
                {
                    using (var searcher = new PrincipalSearcher(new UserPrincipal(context)))
                    {
                        var users = searcher.FindAll()
                            .Where(u => u.DisplayName != null && u.DisplayName.Contains(term, StringComparison.OrdinalIgnoreCase))
                            .Take(10)
                            .Select(u => new
                            {
                                id = u.Sid.ToString(),
                                name = u.DisplayName,
                                type = "user",
                                email = "abc@meai-india.com"
                            });

                        results.AddRange(users);
                    }

                    using (var searcher = new PrincipalSearcher(new GroupPrincipal(context)))
                    {
                        var groups = searcher.FindAll()
                            .Where(g => g.Name != null && g.Name.Contains(term, StringComparison.OrdinalIgnoreCase))
                            .Take(10)
                            .Select(g =>
                            {
                                var group = g as GroupPrincipal;
                                var members = new List<object>();

                                if (group != null)
                                {
                                    members = group.Members
                                        .Select(m => (object)new
                                        {
                                            name = m.DisplayName ?? m.Name,
                                         
                                        })
                                        .ToList();
                                }

                                return new
                                {
                                    id = g.Sid.ToString(),
                                    name = g.Name,
                                    type = "group",
                                    email = "abc@meai-india.com",
                                    members = members
                                };
                            });

                        results.AddRange(groups);
                    }



                }

                return Ok(results);
            }
            catch (Exception ex)
            {
                // 🔥 Always return JSON object here
                return StatusCode(500, new { error = $"Error searching AD: {ex.Message}" });
            }
        }


        //[HttpPost("submissions/{submissionId}/approve")]
        //public async Task<IActionResult> ApproveSubmission(int submissionId, [FromBody] ApprovalActionDto approvalDto)
        //{
        //    try
        //    {
        //        var submission = await _context.FormSubmissions
        //            .Include(s => s.Form)
        //            .ThenInclude(f => f.Approvers)
        //            .FirstOrDefaultAsync(s => s.Id == submissionId);

        //        if (submission == null)
        //            return NotFound("Submission not found");

        //        // Add approval record
        //        var approval = new FormApproval
        //        {
        //            FormSubmissionId = submissionId,
        //            ApproverId = approvalDto.ApproverId,
        //            ApproverName = approvalDto.ApproverName,
        //            ApprovalLevel = approvalDto.Level,
        //            ApprovedAt = DateTime.Now,
        //            Comments = approvalDto.Comments,
        //            Status = approvalDto.Status // "Approved" or "Rejected"
        //        };

        //        _context.FormApprovals.Add(approval);
        //        await _context.SaveChangesAsync();

        //        return Ok(new { message = "Approval action recorded successfully" });
        //    }
        //    catch (Exception ex)
        //    {
        //        return StatusCode(500, $"Error processing approval: {ex.Message}");
        //    }
        //}

    }
}
