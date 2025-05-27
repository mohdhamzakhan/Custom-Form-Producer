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

            var existingForm = await _context.Forms
                .Include(f => f.Fields)
                .FirstOrDefaultAsync(f => f.FormLink == form.FormLink);

            if (existingForm != null)
            {
                // Update existing form properties
                existingForm.Name = form.Name;

                foreach (var field in form.Fields)
                {
                    var existingField = existingForm.Fields.FirstOrDefault(f => f.Id == field.Id);

                    if (existingField != null)
                    {
                        // Update existing field
                        _context.Entry(existingField).CurrentValues.SetValues(field);

                        if (field.Type == "grid" && field.Columns != null)
                        {
                            // Handle grid columns manually
                            var updatedColumns = field.Columns;

                            if (!string.IsNullOrEmpty(existingField.ColumnsJson))
                            {
                                var existingColumns = JsonSerializer.Deserialize<List<GridColumn>>(existingField.ColumnsJson) ?? new List<GridColumn>();

                                foreach (var column in updatedColumns)
                                {
                                    var existingColumn = existingColumns.FirstOrDefault(c => c.Id == column.Id);

                                    if (existingColumn != null)
                                    {
                                        // Update existing column in the JSON
                                        existingColumn.Name = column.Name;
                                        existingColumn.Type = column.Type;
                                        existingColumn.Width = column.Width;
                                        existingColumn.Options = column.Options;
                                        existingColumn.Min = column.Min;
                                        existingColumn.Max = column.Max;
                                        existingColumn.Decimal = column.Decimal;
                                        existingColumn.Formula = column.Formula;
                                        existingColumn.textColor = column.textColor;
                                        existingColumn.backgroundColor = column.backgroundColor;
                                    }
                                    else
                                    {
                                        // Add new column to the JSON
                                        existingColumns.Add(column);
                                    }
                                }

                                // Serialize updated columns back to the JSON field
                                existingField.ColumnsJson = JsonSerializer.Serialize(existingColumns);
                            }
                            else
                            {
                                // Handle case where ColumnsJson is null
                                existingField.ColumnsJson = JsonSerializer.Serialize(updatedColumns);
                            }
                        }
                    }
                    else
                    {
                        // Add new field
                        if (field.Type == "grid" && field.Columns != null)
                        {
                            field.ColumnsJson = JsonSerializer.Serialize(field.Columns);
                        }
                        existingForm.Fields.Add(field);
                    }
                }
            }
            else
            {
                // Add new form
                if (form.Fields != null)
                {
                    foreach (var field in form.Fields)
                    {
                        if (field.Type == "grid" && field.Columns != null)
                        {
                            field.ColumnsJson = JsonSerializer.Serialize(field.Columns);
                        }
                    }
                }
                _context.Forms.Add(form);
            }
            await _context.SaveChangesAsync();
            return Ok(new { formLink = form.FormLink });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateForm(int id, [FromBody] Form form)
        {
            if (id != form.Id)
                return BadRequest();

            var existingForm = await _context.Forms
                .Include(f => f.Fields)
                .ThenInclude(f => f.RemarkTriggers)
                .Include(f => f.Approvers.OrderBy(a => a.Level)) // 👈 Include and order approvers
                .FirstOrDefaultAsync(f => f.Id == id);

            if (existingForm == null)
                return NotFound();

            // Set the original RowVersion for concurrency check
            _context.Entry(existingForm)
                .Property(f => f.RowVersion).OriginalValue = form.RowVersion;

            // Update form properties
            existingForm.Name = form.Name;
            // Add other properties here as needed

            // Remove old fields and their related RemarkTriggers
            //foreach (var field in existingForm.Fields)
            //{
            //    _context.RemarkTrigger.RemoveRange(field.RemarkTriggers);
            //}
            // Get existing field IDs
            var existingFieldIds = existingForm.Fields.Select(f => f.Id).ToHashSet();
            var incomingFieldIds = form.Fields.Select(f => f.Id).ToHashSet();

            // Remove fields that are no longer present
            var fieldsToRemove = existingForm.Fields.Where(f => !incomingFieldIds.Contains(f.Id)).ToList();
            _context.FormFields.RemoveRange(fieldsToRemove);

            // Update existing and add new fields
            foreach (var field in form.Fields)
            {
                var existingField = existingForm.Fields.FirstOrDefault(f => f.Id == field.Id);

                if (existingField != null)
                {
                    // Update existing field
                    existingField.Label = field.Label;
                    existingField.Type = field.Type;
                    existingField.Columns = field.Columns;
                    existingField.ColumnsJson = field.ColumnsJson;
                    existingField.Decimal = field.Decimal;
                    existingField.FieldReferences = field.FieldReferences;
                    existingField.FieldReferencesJson = field.FieldReferencesJson;
                    existingField.Formula = field.Formula;
                    existingField.InitialRows = field.InitialRows;
                    existingField.MaxRows = field.MaxRows;
                    existingField.MinRows = field.MinRows;
                    existingField.Options = field.Options;
                    existingField.Required = field.Required;
                    existingField.Max = field.Max;
                    existingField.Min = field.Min;
                    existingField.Width = field.Width;
                    existingField.RequiresRemarks = field.RequiresRemarks;
                    existingField.Order = field.Order;
                    existingField.ResultDecimal = field.ResultDecimal;
                    existingField.OptionsJson = field.OptionsJson;
                    existingField.RemarkTriggersJson = field.RemarkTriggersJson;
                    existingField.RequireRemarksOutOfRange = field.RequireRemarksOutOfRange;
                    existingField.RequiresRemarksJson = field.RequiresRemarksJson;

                    // Update RemarkTriggers (optional: replace all or do granular updates)
                    existingField.RemarkTriggers = field.RemarkTriggers?.Select(rt => new RemarkTrigger
                    {
                        Operator = rt.Operator,
                        Value = rt.Value
                    }).ToList() ?? new List<RemarkTrigger>();
                }
                else
                {
                    // Add new field
                    var newField = new FormField
                    {
                        Id = field.Id != Guid.Empty ? field.Id : Guid.NewGuid(),
                        FormId = id,
                        Label = field.Label,
                        Type = field.Type,
                        Columns = field.Columns,
                        ColumnsJson = field.ColumnsJson,
                        Decimal = field.Decimal,
                        FieldReferences = field.FieldReferences,
                        FieldReferencesJson = field.FieldReferencesJson,
                        Formula = field.Formula,
                        InitialRows = field.InitialRows,
                        MaxRows = field.MaxRows,
                        MinRows = field.MinRows,
                        Options = field.Options,
                        Required = field.Required,
                        Max = field.Max,
                        Min = field.Min,
                        Width = field.Width,
                        RequiresRemarks = field.RequiresRemarks,
                        Order = field.Order,
                        ResultDecimal = field.ResultDecimal,
                        OptionsJson = field.OptionsJson,
                        RemarkTriggersJson = field.RemarkTriggersJson,
                        RequireRemarksOutOfRange = field.RequireRemarksOutOfRange,
                        RequiresRemarksJson = field.RequiresRemarksJson,
                        RemarkTriggers = field.RemarkTriggers?.Select(rt => new RemarkTrigger
                        {
                            Operator = rt.Operator,
                            Value = rt.Value
                        }).ToList() ?? new List<RemarkTrigger>()
                    };

                    _context.FormFields.Add(newField);
                }
            }


            _context.FormApprovers.RemoveRange(existingForm.Approvers);
            foreach (var approver in form.Approvers)
            {
                FormApprover formApprover = new FormApprover
                {
                    AdObjectId = approver.AdObjectId,
                    Email = approver.Email,
                    Form = approver.Form,
                    FormId = id,
                    Level = approver.Level,
                    Name = approver.Name,
                    Type = approver.Type
                };

                _context.FormApprovers.Add(formApprover);
            }

            try
            {
                await _context.SaveChangesAsync();
                return Ok(existingForm);
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "The form was modified by someone else. Please reload and try again." });
            }
        }

        // ✅ Get form by ID
        [HttpGet("{id}")]
        public async Task<IActionResult> GetForm(int id)
        {
            var form = await _context.Forms
                .Include(f => f.Fields.OrderBy(field => field.Order)) // Order by the new field
                .Include(f => f.Approvers.OrderBy(a => a.Level))
                // Other includes...
                .FirstOrDefaultAsync(f => f.Id == id);
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
                .Include(f => f.Fields.OrderBy(field => field.Order)) // Order by the new field
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
                        backgroundColor = ct.backgroundColor,
                        textColor = ct.textColor,
                        Options = ct.Options ?? new List<string>(),

                        // ✅ Add these lines:
                        ParentColumn = ct.ParentColumn,
                        DependentOptions = ct.DependentOptions,
                        StartTime = ct.StartTime,
                        EndTime = ct.EndTime
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
                return BadRequest("Form ID in URL does not match the one in submission data");

            if (submissionDTO.SubmissionData == null || !submissionDTO.SubmissionData.Any())
                return BadRequest("No form data provided");

            var form = await _context.Forms
                .Include(f => f.Approvers.OrderBy(a => a.Level))
                .FirstOrDefaultAsync(f => f.Id == formId);

            if (form == null)
                return NotFound("Form not found");

            FormSubmission formSubmission;

            // ✅ EDIT mode
            if (submissionDTO.SubmissionId.HasValue && submissionDTO.SubmissionId.Value > 0)
            {
                formSubmission = await _context.FormSubmissions
                    .Include(s => s.SubmissionData)
                    .Include(s => s.Approvals)
                    .FirstOrDefaultAsync(s => s.Id == submissionDTO.SubmissionId.Value);

                if (formSubmission == null)
                    return NotFound("Submission not found");

                // Clear previous data
                _context.FormSubmissionData.RemoveRange(formSubmission.SubmissionData);
                _context.FormApprovals.RemoveRange(formSubmission.Approvals);

                formSubmission.SubmittedAt = DateTime.Now;
                formSubmission.SubmissionData = new List<FormSubmissionData>();
                formSubmission.Approvals = new List<FormApproval>();
            }
            else
            {
                // ✅ CREATE mode
                formSubmission = new FormSubmission
                {
                    FormId = formId,
                    SubmittedAt = DateTime.Now,
                    SubmissionData = new List<FormSubmissionData>(),
                    Approvals = new List<FormApproval>()
                };
                _context.FormSubmissions.Add(formSubmission);
            }

            // Add form field data
            foreach (var data in submissionDTO.SubmissionData)
            {
                formSubmission.SubmissionData.Add(new FormSubmissionData
                {
                    FieldLabel = data.FieldLabel,
                    FieldValue = data.FieldValue
                });
            }

            await _context.SaveChangesAsync(); // Save to generate formSubmission.Id

            // 🔥 Handle approvals
            if (form.Approvers == null || form.Approvers.Count == 0)
            {
                // Auto-approve if no approvers exist
                formSubmission.Approvals.Add(new FormApproval
                {
                    ApprovalLevel = 0,
                    ApproverId = 0,
                    ApproverName = "System Approval",
                    Status = "Approved",
                    Comments = "Auto Approved",
                    ApprovedAt = DateTime.Now // ✅ Required!
                });
            }
            else
            {
                // Add Level 1 approver only with Pending status
                var firstApprover = form.Approvers.First();
                formSubmission.Approvals.Add(new FormApproval
                {
                    FormSubmissionId = formSubmission.Id,
                    ApprovalLevel = 1,
                    ApproverId = 1,
                    ApproverName = "User Submission",
                    Status = "_",
                    Comments = "User Submission",
                    ApprovedAt = DateTime.Now

                });
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                id = formSubmission.Id,
                message = submissionDTO.SubmissionId.HasValue
                    ? "Form updated successfully"
                    : "Form submitted successfully"
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
                            Status = "Rejected",
                            
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
                    else if(approvals.Count() == 0)
                    {
                        return new
                        {
                            s.Id,
                            s.SubmittedAt,
                            Status = "Pending"
                        };
                    }
                    else if(approvals.Count(a=>a == "Pending") < s.ApproversRequired)
                    {
                        return new
                        {
                            s.Id,
                            s.SubmittedAt,
                            Status = "Initial Approval Done"
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
                .Where(f =>
                    !f.Approvers.Any() || // Include forms with no approvers
                    f.Approvers.Any(a => names.Contains(a.Name))) // Or matching approver
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
                    .Include(f => f.Fields.OrderBy(field => field.Order))
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

        [HttpGet("{formId}/fields")]
        public async Task<IActionResult> GetFormFields(int formId)
        {
            var form = await _context.Forms
                .Include(f => f.Fields)
                .FirstOrDefaultAsync(f => f.Id == formId);

            if (form == null)
                return NotFound("Form not found.");

            var fields = form.Fields.Select(f => new {
                id = f.Id,
                label = f.Label,
                type = f.Type, // ✅ Add this to support field type rendering
                columnJson = f.ColumnsJson // lowercase to match frontend expectation
            });

            return Ok(fields);
        }
    }
}
