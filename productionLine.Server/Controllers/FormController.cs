using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using productionLine.Server.DTO;
using productionLine.Server.Model;
using System.DirectoryServices.AccountManagement;
using System.Runtime.Versioning;
using System.Text.Json;

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

            // 🔥 Before saving, manually serialize grid columns
            if (form.Fields != null)
            {
                foreach (var field in form.Fields)
                {
                    if (field.Type == "grid" && field.Columns != null)
                    {
                        // 🔥 Save columns as JSON
                        field.ColumnsJson = JsonSerializer.Serialize(field.Columns);
                    }
                }
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

            // 🔥 After loading, manually deserialize columns
            foreach (var field in form.Fields)
            {
                if (field.Type == "grid" && !string.IsNullOrEmpty(field.ColumnsJson))
                {
                    field.Columns = JsonSerializer.Deserialize<List<GridColumn>>(field.ColumnsJson);
                }
            }

            return Ok(form);
        }


        [HttpGet("link/{formLink}")]
        public async Task<IActionResult> GetFormByLink(string formLink)
        {
            var form = await _context.Forms
                .Include(f => f.Fields)
                .ThenInclude(field => field.RemarkTriggers)
                .FirstOrDefaultAsync(f => f.FormLink == formLink);

            if (form == null)
                return NotFound("Form not found.");

            var formDto = new FormDto
            {
                Id = form.Id,
                FormLink = form.FormLink,
                Name = form.Name,
                Fields = form.Fields.Select(f => new FieldDto
                {
                    Id = f.Id,
                    Name = f.Label, // fixed: using field name, not form name
                    Type = f.Type,
                    Label = f.Label,
                    Options = f.Options,
                    Required = f.Required,
                    Width = f.Width,
                    RequireRemarks = f.RequiresRemarks,
                    IsDecimal = f.Decimal,
                    Max = f.Max,
                    Min = f.Min,
                    RemarkTriggers = f.RemarkTriggers?.Select(rt => new RemarkTriggerDto
                    {
                        Id = rt.Id,
                        Operator = rt.Operator,
                        Value = rt.Value
                    }).ToList() ?? new List<RemarkTriggerDto>(),
                    Column = f.Columns?.Select(ct => new GridColumnDto
                    {
                        Formula = ct.Formula,
                        Name = ct.Name,
                        Decimal = ct.Decimal,
                        Max = ct.Max,
                        Id = ct.Id,
                        Min = ct.Min,
                        Type = ct.Type,
                        Width = ct.Width,
                        Options = ct.Options ?? null
                    }).ToList() ?? new List<GridColumnDto>(),
                    Formula = f.Formula,
                    InitialRows = f.InitialRows,
                    MaxRows = f.MaxRows,
                    MinRows = f.MinRows,
                    ResultDecimal = f.ResultDecimal,
                    FieldReferencesJson = f.FieldReferencesJson
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

        // Assuming you have a controller like [Route("api/forms")]
        [HttpGet("{form}/lastsubmissions")]
        public async Task<IActionResult> GetLastSubmissions(string form)
        {
            var formId = await _context.Forms
                .Where(x => x.FormLink == form.ToLower())
                .Select(y => y.Id)
                .FirstOrDefaultAsync();
            try
            {
                var submissions = await _context.FormSubmissions
.Where(s => s.FormId == formId)
.OrderByDescending(s => s.SubmittedAt)
.Take(10)
.Select(s => new
{
    Id = s.Id,
    SubmittedAt = s.SubmittedAt,
    Approvals = s.Approvals.Select(a => a.Status).ToList(),
    ApproversRequired = _context.FormApprovers
.Where(a => a.FormId == s.FormId)
.Count()
})
.ToListAsync();

                // After fetching, calculate status
                var result = submissions.Select(s =>
                {
                    var approvals = s.Approvals ?? new List<string>();

                    if (approvals.Any(a => a == "Rejected"))
                    {
                        return new
                        {
                            s.Id,
                            s.SubmittedAt,
                            Status = "Rejected"
                        };
                    }
                    else if (approvals.Count(a => a == "Approved") >= s.ApproversRequired)
                    {
                        return new
                        {
                            s.Id,
                            s.SubmittedAt,
                            Status = "Approved"
                        };
                    }
                    else
                    {
                        return new
                        {
                            s.Id,
                            s.SubmittedAt,
                            Status = "Pending"
                        };
                    }
                });

                return Ok(result);


            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }


        [HttpPost("GetALLForm")]
        public async Task<IActionResult> GetAllForm([FromBody] List<string> names)
        {
            var forms = await _context.Forms
                .Where(f => f.Approvers.Any(a => names.Contains(a.Name)))
                .Include(f => f.Approvers)
                .ToListAsync();
            return Ok(forms);
        }


        [HttpGet("GetALLForms/{submissionId}")]
        public async Task<IActionResult> GetAllForms(int submissionId)
        {
            var submission = await _context.FormSubmissions
        .Include(s => s.SubmissionData)
        .Include(s => s.Approvals)
        .Include(s => s.Form)
            .ThenInclude(f => f.Approvers)
        .FirstOrDefaultAsync(s => s.FormId == submissionId);

            if (submission == null)
            {
                return BadRequest("Unable to retirve the data may be there is no submission");
            }

            return Ok(submission);
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
    .Include(s => s.SubmissionData)
    .Include(s => s.Approvals)
    .Include(s => s.Form)
    .ThenInclude(f => f.Approvers)  // 🔥 Critical!// 👈 ADD THIS
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
           .Include(s => s.Approvals)
           .Include(s => s.Form)
               .ThenInclude(f => f.Approvers) // 🔥 This line is MANDATORY!
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
        [SupportedOSPlatform("windows")]
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
                                name = u.SamAccountName,
                                type = "user",
                                email = (u as UserPrincipal)?.EmailAddress ?? u.UserPrincipalName
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


        [HttpPost("submissions/{submissionId}/approve")]
        public async Task<IActionResult> ApproveSubmission(int submissionId, [FromBody] ApprovalActionDto approvalDto)
        {
            try
            {
                var submission = await _context.FormSubmissions
                    .Include(s => s.Form)
                    .ThenInclude(f => f.Approvers)
                    .FirstOrDefaultAsync(s => s.Id == submissionId);

                if (submission == null)
                    return NotFound("Submission not found");

                // Add approval record
                var approval = new FormApproval
                {
                    FormSubmissionId = submissionId,
                    ApproverId = approvalDto.ApproverId,
                    ApproverName = approvalDto.ApproverName,
                    ApprovalLevel = approvalDto.Level,
                    ApprovedAt = DateTime.Now,
                    Comments = approvalDto.Comments,
                    Status = approvalDto.Status // "Approved" or "Rejected"
                };

                _context.FormApprovals.Add(approval);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Approval action recorded successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error processing approval: {ex.Message}");
            }
        }

    }
}
