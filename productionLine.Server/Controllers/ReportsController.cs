using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using productionLine.Server.DTO;
using productionLine.Server.Model;
using productionLine.Server.Service;
using System.Text.Json;

namespace productionLine.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportsController : ControllerBase
    {
        private readonly FormDbContext _context;
        public ReportsController(FormDbContext context)
        {
            _context = context;
        }
        [HttpGet("production")]
        public async Task<IActionResult> GetProductionReport(int formId, DateTime start, DateTime end)
        {
            try
            {
                var submissions = await _context.FormSubmissions
                    .Where(s => s.FormId == formId && s.SubmittedAt >= start && s.SubmittedAt <= end)
                    .Include(s => s.SubmissionData)
                    .ToListAsync();

                if (!submissions.Any())
                    return Ok(new { mttb = 0, mttf = 0, mttr = 0 });

                double totalDowntime = 0; // In minutes
                int failureCount = 0;

                foreach (var sub in submissions)
                {
                    var downtimeField = sub.SubmissionData.FirstOrDefault(d => d.FieldLabel == "Downtime"); // Adjust FieldLabel
                    if (downtimeField != null && double.TryParse(downtimeField.FieldValue, out var downtimeMinutes))
                    {
                        totalDowntime += downtimeMinutes;
                        failureCount++;
                    }
                }

                var mttr = failureCount > 0 ? (totalDowntime / failureCount) / 60.0 : 0; // Convert minutes to hours
                var mttb = failureCount > 0 ? (1440.0 / failureCount) / 60.0 : 0;         // Assume 1 day (1440 minutes) operations
                var mttf = failureCount > 0 ? (1440.0 / failureCount) / 60.0 : 0;         // Same as MTTB if no extra failure data

                return Ok(new
                {
                    mttb = Math.Round(mttb, 2),
                    mttf = Math.Round(mttf, 2),
                    mttr = Math.Round(mttr, 2)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateReport([FromBody] ReportDto reportDto)
        {
            var report = new Report
            {
                FormId = reportDto.FormId,
                Name = reportDto.Name,
                Description = reportDto.Description,
                LayoutType = reportDto.LayoutType,
                DefinitionJson = reportDto.DefinitionJson,
                CreatedBy = User.Identity.Name ?? "Hamza",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                AccessList = reportDto.AccessList.Select(a => new ReportAccess
                {
                    UserOrGroupId = a.UserOrGroupId,
                    AccessType = a.AccessType
                }).ToList()
            };

            _context.Reports.Add(report);
            await _context.SaveChangesAsync();
            return Ok(new { report.Id });
        }
        [HttpGet("form/{formId}")]
        public async Task<IActionResult> GetReportsForForm(int formId)
        {
            var reports = await _context.Reports
                .Where(r => r.FormId == formId)
                .Include(r => r.AccessList)
                .ToListAsync();

            return Ok(reports);
        }
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateReport(int id, [FromBody] ReportDto updated)
        {
            var report = await _context.Reports
                .Include(r => r.AccessList)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (report == null) return NotFound();

            report.Name = updated.Name;
            report.Description = updated.Description;
            report.LayoutType = updated.LayoutType;
            report.DefinitionJson = updated.DefinitionJson;
            report.UpdatedAt = DateTime.UtcNow;

            report.AccessList.Clear();
            foreach (var a in updated.AccessList)
            {
                report.AccessList.Add(new ReportAccess
                {
                    UserOrGroupId = a.UserOrGroupId,
                    AccessType = a.AccessType
                });
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }
        [HttpGet("{id}")]
        public async Task<IActionResult> GetReportById(int id)
        {
            var report = await _context.Reports
                .Include(r => r.AccessList)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (report == null) return NotFound();

            return Ok(report);
        }

        [HttpPost("save")]
        public async Task<IActionResult> SaveTemplate([FromBody] ReportTemplateDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                return BadRequest(new { message = "Invalid model", errors });
            }

            if (string.IsNullOrWhiteSpace(dto.Name) || dto.Fields.Count == 0)
                return BadRequest("Template name and at least one field are required.");

            ReportTemplate template;

            if (dto.Id > 0)
            {
                template = await _context.ReportTemplates
                    .Include(t => t.Fields)
                    .Include(t => t.Filters)
                    .FirstOrDefaultAsync(t => t.Id == dto.Id);

                if (template == null)
                    return NotFound("Report template not found.");

                template.Name = dto.Name;
                template.FormId = dto.FormId;
                template.IncludeApprovals = dto.IncludeApprovals;
                template.IncludeRemarks = dto.IncludeRemarks;
                template.SharedWithRole = dto.SharedWithRole;


                _context.ReportFields.RemoveRange(template.Fields);
                _context.ReportFilters.RemoveRange(template.Filters);

                template.Fields = dto.Fields.Select((f, index) => new ReportField
                {
                    FieldId = f.FieldId,
                    FieldLabel = f.FieldLabel,
                    Order = index
                }).ToList();

                template.Filters = dto.Filters.Select(f => new ReportFilter
                {
                    FieldLabel = f.FieldLabel,
                    Operator = f.Operator,
                    Value = f.Value,
                    Type = f.Type
                }).ToList();
                template.CalculatedFields = dto.CalculatedFields?.Any() == true
    ? JsonSerializer.Serialize(dto.CalculatedFields)
    : null;

                template.ChartConfig = dto.ChartConfigs != null
                    ? JsonSerializer.Serialize(dto.ChartConfigs)
                    : null;

            }
            else
            {
                template = new ReportTemplate
                {
                    Name = dto.Name,
                    FormId = dto.FormId,
                    CreatedBy = dto.CreatedBy ?? "system",
                    CreatedAt = DateTime.UtcNow,
                    IncludeApprovals = dto.IncludeApprovals,
                    IncludeRemarks = dto.IncludeRemarks,
                    SharedWithRole = dto.SharedWithRole,
                    Fields = dto.Fields.Select((f, index) => new ReportField
                    {
                        FieldId = f.FieldId,
                        FieldLabel = f.FieldLabel,
                        Order = index
                    }).ToList(),
                    Filters = dto.Filters.Select(f => new ReportFilter
                    {
                        FieldLabel = f.FieldLabel,
                        Operator = f.Operator,
                        Value = f.Value,
                        Type = f.Type
                    }).ToList(),
                    CalculatedFields = JsonSerializer.Serialize(dto.CalculatedFields ?? new List<CalculatedField>()),
                    ChartConfig = dto.ChartConfigs?.Any() == true
                                    ? JsonSerializer.Serialize(dto.ChartConfigs)
                                    : null
                };

                _context.ReportTemplates.Add(template);
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Template saved successfully." });
        }

        [HttpPost("run/{templateId}")]
        public async Task<IActionResult> RunReport(int templateId, [FromBody] Dictionary<string, string> runtimeValues)
        {
            var template = await _context.ReportTemplates
                .Include(t => t.Fields)
                .Include(t => t.Filters)
                .FirstOrDefaultAsync(t => t.Id == templateId);
            if (template == null)
                return NotFound("Template not found.");

            var form = await _context.Forms
                .Include(f => f.Fields)
                .FirstOrDefaultAsync(f => f.Id == template.FormId);
            if (form == null)
                return NotFound("Form not found.");

            var formFields = form.Fields.ToList();
            var formSubmissions = await _context.FormSubmissions
                .Include(s => s.Approvals)
                .Include(s => s.SubmissionData)
                .Where(s => s.FormId == template.FormId && s.Approvals.Any(a => a.Status == "Approved"))
                .ToListAsync();

            var filtered = ApplyFilters(template.Filters, formSubmissions, runtimeValues);

            var result = new List<object>();

            foreach (var sub in filtered)
            {
                // Check if any field is a grid field
                var hasGridFields = template.Fields.Any(f => f.FieldLabel.Contains("→"));

                if (hasGridFields)
                {
                    // Handle grid expansion - create multiple rows
                    var gridData = GetExpandedGridData(sub, template.Fields, formFields);
                    result.AddRange(gridData);
                }
                else
                {
                    // Handle normal single-row data
                    var singleRow = CreateSingleRow(sub, template.Fields, formFields);
                    result.Add(singleRow);
                }
            }

            return Ok(result);
        }

        private List<object> GetExpandedGridData(FormSubmission sub, ICollection<ReportField> reportFields, List<FormField> formFields)
        {
            var result = new List<object>();

            // Group fields into grid sections and normal fields
            var gridFieldGroups = reportFields
                .Where(f => f.FieldLabel.Contains("→"))
                .GroupBy(f => f.FieldLabel.Split("→")[0].Trim())
                .ToList();

            var normalFields = reportFields.Where(f => !f.FieldLabel.Contains("→")).ToList();

            // 1. Build dictionary of normal field values
            var normalValues = new Dictionary<string, string>();
            foreach (var field in normalFields)
            {
                var formField = formFields.FirstOrDefault(f => f.Label == field.FieldLabel);
                if (formField != null)
                {
                    var match = sub.SubmissionData.FirstOrDefault(d => d.FieldLabel == formField.Id.ToString());
                    if (match != null)
                    {
                        normalValues[field.FieldLabel] = match.FieldValue ?? "-";
                    }
                }
            }

            // 2. Build dictionary of grid field rows per group (e.g., "Production Details", "Operator Details")
            var gridRowsPerGroup = new Dictionary<string, List<Dictionary<string, object>>>();
            int maxRowCount = 0;

            foreach (var group in gridFieldGroups)
            {
                var sectionName = group.Key;
                var formField = formFields.FirstOrDefault(f => f.Label == sectionName);
                if (formField == null) continue;

                var submissionData = sub.SubmissionData.FirstOrDefault(d => d.FieldLabel == formField.Id.ToString());
                if (submissionData == null || string.IsNullOrWhiteSpace(submissionData.FieldValue)) continue;

                try
                {
                    var rows = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(submissionData.FieldValue);
                    gridRowsPerGroup[sectionName] = rows;
                    maxRowCount = Math.Max(maxRowCount, rows.Count);
                }
                catch
                {
                    // skip invalid grid JSON
                    continue;
                }
            }

            // 3. Merge all grid and normal field values by row
            for (int rowIndex = 0; rowIndex < maxRowCount; rowIndex++)
            {
                var rowData = new List<object>();

                // Add normal (flat) fields to every row
                foreach (var field in normalFields)
                {
                    rowData.Add(new
                    {
                        fieldLabel = field.FieldLabel,
                        value = normalValues.ContainsKey(field.FieldLabel) ? normalValues[field.FieldLabel] : "-"
                    });
                }

                // Add grid fields from each group
                foreach (var group in gridFieldGroups)
                {
                    var sectionName = group.Key;
                    if (!gridRowsPerGroup.ContainsKey(sectionName)) continue;

                    var rows = gridRowsPerGroup[sectionName];
                    var row = rowIndex < rows.Count ? rows[rowIndex] : null;

                    foreach (var field in group)
                    {
                        var columnName = field.FieldLabel.Split("→")[1].Trim();
                        var value = row != null && row.TryGetValue(columnName, out var val) ? val?.ToString() ?? "-" : "-";

                        rowData.Add(new
                        {
                            fieldLabel = field.FieldLabel,
                            value = value
                        });
                    }
                }

                result.Add(new
                {
                    submissionId = sub.Id,
                    submittedAt = sub.SubmittedAt,
                    gridRowIndex = rowIndex + 1,
                    data = rowData
                });
            }

            return result;
        }


        private object CreateSingleRow(FormSubmission sub, ICollection<ReportField> reportFields, List<FormField> formFields)
        {
            return new
            {
                submissionId = sub.Id,
                submittedAt = sub.SubmittedAt,
                data = reportFields.Select(reportField =>
                {
                    string value = "-";
                    var fieldId = reportField.FieldLabel;

                    var formField = formFields.FirstOrDefault(f => f.Label == fieldId);
                    if (formField != null)
                    {
                        var match = sub.SubmissionData
                                       .FirstOrDefault(d => d.FieldLabel == formField.Id.ToString());
                        if (match != null) value = match.FieldValue ?? "-";
                    }

                    return new
                    {
                        fieldLabel = reportField.FieldLabel,
                        value = value
                    };
                }).ToList()
            };
        }



        private List<FormSubmission> ApplyFilters(
     List<ReportFilter> filters,
     List<FormSubmission> submissions,
     Dictionary<string, string> runtimeValues)
        {
            foreach (var filter in filters)
            {
                var field = filter.FieldLabel;

                // ✅ Skip if filter is not provided or value is empty/null
                if (!runtimeValues.TryGetValue(field, out var rawValue) || string.IsNullOrWhiteSpace(rawValue))
                    continue;

                var op = filter.Operator;
                var value = rawValue;

                submissions = submissions.Where(sub =>
                {
                    var match = sub.SubmissionData.FirstOrDefault(d => d.FieldLabel == field);
                    if (match == null || string.IsNullOrWhiteSpace(match.FieldValue)) return false;

                    switch (op)
                    {
                        case "equals":
                            return match.FieldValue == value;

                        case "contains":
                            return match.FieldValue?.IndexOf(value, StringComparison.OrdinalIgnoreCase) >= 0;

                        case "greaterThan":
                            return double.TryParse(match.FieldValue, out var n1) && double.TryParse(value, out var n2) && n1 > n2;

                        case "lessThan":
                            return double.TryParse(match.FieldValue, out var m1) && double.TryParse(value, out var m2) && m1 < m2;

                        case "between":
                            var parts = value.Split(',', StringSplitOptions.RemoveEmptyEntries);
                            if (parts.Length == 2 &&
                                DateTime.TryParse(parts[0], out var start) &&
                                DateTime.TryParse(parts[1], out var end) &&
                                DateTime.TryParse(match.FieldValue, out var actual))
                            {
                                return actual >= start && actual <= end;
                            }
                            return false;

                        default:
                            return true;
                    }
                }).ToList();
            }


            return submissions;
        }

        [HttpGet("template/{reportId}")]
        public async Task<IActionResult> GetTemplate(int reportId)
        {
            var template = await _context.ReportTemplates
                .Include(t => t.Fields)
                .Include(t => t.Filters)
                .FirstOrDefaultAsync(t => t.Id == reportId);

            if (template == null)
                return NotFound("Template not found.");

            return Ok(new
            {
                id = template.Id,
                name = template.Name,
                formId = template.FormId,
                fields = template.Fields.Select(f => new
                {
                    f.Id,
                    f.FieldId,
                    f.FieldLabel,
                    f.Order
                }).ToList(),
                filters = template.Filters,
                sharedWithRole = !string.IsNullOrEmpty(template.SharedWithRole)
                    ? JsonSerializer.Deserialize<List<string>>(template.SharedWithRole)
                    : new List<string>(),
                calculatedFields = !string.IsNullOrEmpty(template.CalculatedFields)
                    ? JsonSerializer.Deserialize<List<CalculatedField>>(template.CalculatedFields)
                    : new List<CalculatedField>(),
                chartConfig = !string.IsNullOrEmpty(template.ChartConfig)
                    ? JsonSerializer.Deserialize<List<ChartConfig>>(template.ChartConfig)
                    : new List<ChartConfig>()
            });
        }


        // Add these new endpoints to your existing ReportsController.cs

        [HttpGet("list")]  // Changed back to HttpGet
        public async Task<IActionResult> GetReportsList(string username, bool includeShared = true)
        {
            try
            {
                var query = _context.ReportTemplates
                    .AsQueryable();

                // Only get reports created by the user
                //query = query.Where(r => r.CreatedBy == username);

                var reports = await query
                    .Select(r => new
                    {
                        r.Id,
                        r.Name,
                        r.SharedWithRole,
                        r.IncludeRemarks,
                        //CreatedAt = r.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                        //UpdatedAt = r.UpdatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                        r.FormId
                    })
                    .ToListAsync();

                return Ok(reports);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReport(int id)
        {
            var report = await _context.Reports.FindAsync(id);

            if (report == null)
                return NotFound();

            // Optional: Add authorization check
            if (report.CreatedBy != User.Identity?.Name)
                return Forbid();

            _context.Reports.Remove(report);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        [HttpGet("dropdown-options/{templateId}/{fieldLabel}")]
        public async Task<IActionResult> GetDropdownOptions(int templateId, string fieldLabel)
        {
            var template = await _context.ReportTemplates
                .Include(t => t.Fields)
                .FirstOrDefaultAsync(t => t.Id == templateId);

            if (template == null)
                return NotFound("Template not found.");

            var submissions = await _context.FormSubmissions
                .Where(s => s.FormId == template.FormId)
                .Include(s => s.SubmissionData)
                .ToListAsync();

            var distinctValues = submissions
                .SelectMany(s => s.SubmissionData)
                .Where(d => d.FieldLabel == fieldLabel)
                .Select(d => d.FieldValue)
                .Distinct()
                .Where(v => !string.IsNullOrEmpty(v))
                .ToList();

            return Ok(distinctValues);
        }

    }
}
