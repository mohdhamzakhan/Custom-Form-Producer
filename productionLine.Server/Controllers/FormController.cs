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

        [HttpGet]
        public async Task<IActionResult> GetAllFormName()
        {
            var forms = await _context.Forms
    .Select(f => new { f.Id, f.Name, f.FormLink })
    .ToListAsync();
            return Ok(forms);
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
            {
                return BadRequest();
            }
            Form existingForm = await _context.Forms.Include((Form f) => f.Fields).ThenInclude((FormField f) => f.RemarkTriggers).Include((Form f) => f.Approvers.OrderBy((FormApprover a) => a.Level))
                .FirstOrDefaultAsync((Form f) => f.Id == id);
            if (existingForm == null)
            {
                return NotFound();
            }
            _context.Entry(existingForm).Property((Form f) => f.RowVersion).OriginalValue = form.RowVersion;
            existingForm.Name = form.Name;
            existingForm.Fields.Select((FormField f) => f.Id).ToHashSet();
            HashSet<Guid> incomingFieldIds = form.Fields.Select((FormField f) => f.Id).ToHashSet();
            List<FormField> fieldsToRemove = existingForm.Fields.Where((FormField f) => !incomingFieldIds.Contains(f.Id)).ToList();
            _context.FormFields.RemoveRange(fieldsToRemove);
            foreach (FormField field in form.Fields)
            {
                FormField existingField = existingForm.Fields.FirstOrDefault((FormField f) => f.Id == field.Id);
                if (existingField != null)
                {
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
                    existingField.ImageValue = field.ImageValue;
                    existingField.RemarkTriggers = field.RemarkTriggers?.Select((RemarkTrigger rt) => new RemarkTrigger
                    {
                        Operator = rt.Operator,
                        Value = rt.Value
                    }).ToList() ?? new List<RemarkTrigger>();
                    continue;
                }
                FormField newField = new FormField
                {
                    Id = ((field.Id != Guid.Empty) ? field.Id : Guid.NewGuid()),
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
                    RemarkTriggers = (field.RemarkTriggers?.Select((RemarkTrigger rt) => new RemarkTrigger
                    {
                        Operator = rt.Operator,
                        Value = rt.Value
                    }).ToList() ?? new List<RemarkTrigger>())
                };
                _context.FormFields.Add(newField);
            }
            _context.FormApprovers.RemoveRange(existingForm.Approvers);
            foreach (FormApprover approver in form.Approvers)
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
                return Conflict(new
                {
                    message = "The form was modified by someone else. Please reload and try again."
                });
            }
        }


        // ✅ Get form by ID
        [HttpGet("{id}")]
        public async Task<IActionResult> GetForm(int id)
        {
            Form form = await _context.Forms.Include((Form f) => f.Fields.OrderBy((FormField formField) => formField.Order)).Include((Form f) => f.Approvers.OrderBy((FormApprover a) => a.Level)).FirstOrDefaultAsync((Form f) => f.Id == id);
            if (form == null)
            {
                return NotFound("Form not found.");
            }
            foreach (FormField field in form.Fields)
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
            Form form = await _context.Forms.Include((Form f) => f.Fields).Include((Form f) => f.Fields.OrderBy((FormField field) => field.Order)).ThenInclude((FormField field) => field.RemarkTriggers)
                .FirstOrDefaultAsync((Form f) => f.FormLink.ToLower() == formLink.ToLower());
            if (form == null)
            {
                return NotFound("Form not found.");
            }
            FormDto formDto = new FormDto
            {
                Id = form.Id,
                FormLink = form.FormLink,
                Name = form.Name,
                Fields = form.Fields.Select((FormField f) => new FieldDto
                {
                    Id = f.Id,
                    Name = f.Label,
                    Type = f.Type,
                    Label = f.Label,
                    Options = f.Options,
                    Required = f.Required,
                    Width = f.Width,
                    RequireRemarks = f.RequiresRemarks,
                    IsDecimal = f.Decimal,
                    Max = f.Max,
                    Min = f.Min,
                    RemarkTriggers = (f.RemarkTriggers?.Select((RemarkTrigger rt) => new RemarkTriggerDto
                    {
                        Id = rt.Id,
                        Operator = rt.Operator,
                        Value = rt.Value
                    }).ToList() ?? new List<RemarkTriggerDto>()),
                    Column = (f.Columns?.Select((GridColumn ct) => new GridColumnDto
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
                        Options = (ct.Options ?? new List<string>()),
                        ParentColumn = ct.ParentColumn,
                        DependentOptions = ct.DependentOptions,
                        StartTime = ct.StartTime,
                        EndTime = ct.EndTime,
                        Required = ct.Required,
                        RemarksOptions = ct.RemarksOptions
                    }).ToList() ?? new List<GridColumnDto>()),
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
            Form form = await _context.Forms.Include((Form f) => f.Approvers.OrderBy((FormApprover a) => a.Level)).FirstOrDefaultAsync((Form f) => f.Id == formId);
            if (form == null)
            {
                return NotFound("Form not found");
            }
            FormSubmission formSubmission;
            if (submissionDTO.SubmissionId.HasValue && submissionDTO.SubmissionId.Value > 0)
            {
                formSubmission = await _context.FormSubmissions.Include((FormSubmission s) => s.SubmissionData).Include((FormSubmission s) => s.Approvals).FirstOrDefaultAsync((FormSubmission s) => s.Id == submissionDTO.SubmissionId.Value);
                if (formSubmission == null)
                {
                    return NotFound("Submission not found");
                }
                _context.FormSubmissionData.RemoveRange(formSubmission.SubmissionData);
                _context.FormApprovals.RemoveRange(formSubmission.Approvals);
                formSubmission.SubmittedAt = DateTime.Now;
                formSubmission.SubmissionData = new List<FormSubmissionData>();
                formSubmission.Approvals = new List<FormApproval>();
            }
            else
            {
                formSubmission = new FormSubmission
                {
                    FormId = formId,
                    SubmittedAt = DateTime.Now,
                    SubmissionData = new List<FormSubmissionData>(),
                    Approvals = new List<FormApproval>()
                };
                _context.FormSubmissions.Add(formSubmission);
            }
            foreach (FormSubmissionDataDTO data in submissionDTO.SubmissionData)
            {
                formSubmission.SubmissionData.Add(new FormSubmissionData
                {
                    FieldLabel = data.FieldLabel,
                    FieldValue = data.FieldValue
                });
            }
            await _context.SaveChangesAsync();
            if (form.Approvers == null || form.Approvers.Count == 0)
            {
                formSubmission.Approvals.Add(new FormApproval
                {
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
                foreach (FormApprover approver in form.Approvers)
                {
                    formSubmission.Approvals.Add(new FormApproval
                    {
                        FormSubmissionId = formSubmission.Id,
                        ApprovalLevel = approver.Level,
                        ApproverId = 1,
                        ApproverName = approver.Name,
                        Status = "Pending"
                    });
                }
            }
            await _context.SaveChangesAsync();
            return Ok(new
            {
                id = formSubmission.Id,
                message = (submissionDTO.SubmissionId.HasValue ? "Form updated successfully" : "Form submitted successfully")
            });
        }


        // Assuming you have a controller like [Route("api/forms")]
        [HttpGet("{form}/lastsubmissions")]
        public async Task<IActionResult> GetLastSubmissions(string form)
        {
            int formId = await (from y in _context.Forms
                                where y.FormLink == form.ToLower()
                                select y.Id).FirstOrDefaultAsync();
            try
            {
                var result = (await (from s in (from s in _context.FormSubmissions
                                                where s.FormId == formId
                                                orderby s.SubmittedAt descending
                                                select s).Take(10)
                                     select new
                                     {
                                         Id = s.Id,
                                         SubmittedAt = s.SubmittedAt,
                                         Approvals = s.Approvals.Select((FormApproval a) => a.Status).ToList(),
                                         ApproversRequired = _context.FormApprovers.Where((FormApprover a) => a.FormId == s.FormId).Count()
                                     }).ToListAsync()).Select(s =>
                                     {
                                         List<string> source = s.Approvals ?? new List<string>();
                                         if (source.Any((string a) => a == "Rejected"))
                                         {
                                             return new
                                             {
                                                 Id = s.Id,
                                                 SubmittedAt = s.SubmittedAt,
                                                 Status = "Rejected"
                                             };
                                         }
                                         if (source.Count((string a) => a == "Approved") >= s.ApproversRequired)
                                         {
                                             return new
                                             {
                                                 Id = s.Id,
                                                 SubmittedAt = s.SubmittedAt,
                                                 Status = "Approved"
                                             };
                                         }
                                         if (source.Count() == 0)
                                         {
                                             return new
                                             {
                                                 Id = s.Id,
                                                 SubmittedAt = s.SubmittedAt,
                                                 Status = "Pending"
                                             };
                                         }
                                         return (source.Count((string a) => a == "Pending") < s.ApproversRequired) ? new
                                         {
                                             Id = s.Id,
                                             SubmittedAt = s.SubmittedAt,
                                             Status = "Initial Approval Done"
                                         } : new
                                         {
                                             Id = s.Id,
                                             SubmittedAt = s.SubmittedAt,
                                             Status = "Pending"
                                         };
                                     });
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }


        [HttpPost("GetALLForm")]
        public async Task<IActionResult> GetAllForm([FromBody] List<string> names)
        {
            return Ok(await _context.Forms.Where((Form f) => !f.Approvers.Any() || f.Approvers.Any((FormApprover a) => names.Contains(a.Name))).Include((Form f) => f.Approvers).ToListAsync());
        }

        [HttpGet("GetALLForms/{submissionId}")]
        public async Task<IActionResult> GetAllForms(int submissionId)
        {
            FormSubmission submission = await _context.FormSubmissions.Include((FormSubmission s) => s.SubmissionData).Include((FormSubmission s) => s.Approvals).Include((FormSubmission s) => s.Form)
                .ThenInclude((Form f) => f.Approvers)
                .FirstOrDefaultAsync((FormSubmission s) => s.FormId == submissionId);
            if (submission == null)
            {
                return BadRequest("Unable to retirve the data may be there is no submission");
            }
            return Ok(submission);
        }


        [HttpGet("{formId}/submissions")]
        public async Task<ActionResult<IEnumerable<FormSubmission>>> GetFormSubmissions(int formId)
        {
            if (await _context.Forms.FindAsync(formId) == null)
            {
                return NotFound();
            }
            return Ok(await _context.FormSubmissions.Where((FormSubmission s) => s.FormId == formId).Include((FormSubmission s) => s.SubmissionData).Include((FormSubmission s) => s.Approvals)
                .Include((FormSubmission s) => s.Form)
                .ThenInclude((Form f) => f.Approvers)
                .ToListAsync());
        }

        [HttpGet("submissions/{submissionId}")]
        public async Task<ActionResult> GetSubmission(int submissionId)
        {
            try
            {
                FormSubmission submission = await _context.FormSubmissions.Include((FormSubmission s) => s.SubmissionData).Include((FormSubmission s) => s.Approvals).Include((FormSubmission s) => s.Form)
                    .ThenInclude((Form f) => f.Approvers)
                    .FirstOrDefaultAsync((FormSubmission s) => s.Id == submissionId);
                if (submission == null)
                {
                    return NotFound($"Submission with ID {submissionId} not found");
                }
                Form form = await _context.Forms.Include((Form f) => f.Fields).Include((Form f) => f.Fields.OrderBy((FormField field) => field.Order)).FirstOrDefaultAsync((Form f) => f.Id == submission.FormId);
                return Ok(new
                {
                    submission = submission,
                    formDefinition = form
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
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
                if (await _context.FormSubmissions.Include((FormSubmission s) => s.Form).ThenInclude((Form f) => f.Approvers).FirstOrDefaultAsync((FormSubmission s) => s.Id == submissionId) == null)
                {
                    return NotFound("Submission not found");
                }
                FormApproval existingApproval = await _context.FormApprovals.FirstOrDefaultAsync((FormApproval a) => a.FormSubmissionId == submissionId && a.ApprovalLevel == approvalDto.Level && a.ApproverName == approvalDto.ApproverName && a.Status == "Pending");
                if (existingApproval != null)
                {
                    existingApproval.Status = approvalDto.Status;
                    existingApproval.ApprovedAt = DateTime.Now;
                    existingApproval.Comments = approvalDto.Comments;
                    await _context.SaveChangesAsync();
                    return Ok(new
                    {
                        message = "Approval action recorded successfully"
                    });
                }
                return BadRequest("No pending approval found for this approver at this level.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Error processing approval: " + ex.Message);
            }
        }

        [HttpGet("{formId}/fields")]
        public async Task<IActionResult> GetFormFields(int formId)
        {
            Form form = await _context.Forms.Include((Form f) => f.Fields).FirstOrDefaultAsync((Form f) => f.Id == formId);
            if (form == null)
            {
                return NotFound("Form not found.");
            }
            var fields = form.Fields.Select((FormField f) => new
            {
                id = f.Id,
                label = f.Label,
                type = f.Type,
                columnJson = f.ColumnsJson
            });
            return Ok(fields);
        }


        [HttpPost("pending-submissions")]
        public async Task<IActionResult> GetPendingSubmissions([FromBody] List<string> userNames)
        {
            return Ok(await (from s in _context.FormSubmissions.Include((FormSubmission s) => s.Form).ThenInclude((Form f) => f.Approvers).Include((FormSubmission s) => s.Approvals)
                    .Include((FormSubmission s) => s.SubmissionData)
                             where s.Approvals.Any((FormApproval a) => userNames.Contains(a.ApproverName) && a.Status == "Pending")
                             select s).ToListAsync());
        }

    }
}
