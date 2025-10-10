using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using productionLine.Server.DTO;
using productionLine.Server.Model;
using productionLine.Server.Service;
using System.Text.Json;
using System.Text.Json.Serialization;

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
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
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
            report.UpdatedAt = DateTime.Now;

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
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                return BadRequest(new { message = "Invalid model", errors });
            }

            try
            {
                if (string.IsNullOrWhiteSpace(dto.Name) || dto.Fields.Count == 0)
                    return BadRequest("Template name and at least one field are required.");

                var jsonOptions = new JsonSerializerOptions
                {
                    WriteIndented = false,
                    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
                };

                ReportTemplate template;

                if (dto.Id > 0)
                {
                    // --- UPDATE ---
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
                        ? JsonSerializer.Serialize(dto.CalculatedFields, jsonOptions)
                        : null;

                    template.ChartConfig = dto.ChartConfigs?.Any() == true
                        ? JsonSerializer.Serialize(dto.ChartConfigs, jsonOptions)
                        : null;
                }
                else
                {
                    // --- CREATE NEW ---
                    template = new ReportTemplate
                    {
                        Name = dto.Name,
                        FormId = dto.FormId,
                        CreatedBy = dto.CreatedBy ?? "system",
                        CreatedAt = DateTime.Now,
                        IncludeApprovals = dto.IncludeApprovals,
                        IncludeRemarks = dto.IncludeRemarks,
                        SharedWithRole = dto.SharedWithRole,

                        // ✅ Add Fields and Filters immediately
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

                        CalculatedFields = dto.CalculatedFields?.Any() == true
                            ? JsonSerializer.Serialize(dto.CalculatedFields, jsonOptions)
                            : null,

                        ChartConfig = dto.ChartConfigs?.Any() == true
                            ? JsonSerializer.Serialize(dto.ChartConfigs, jsonOptions)
                            : null
                    };

                    _context.ReportTemplates.Add(template);
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Template saved successfully.",
                    id = template.Id
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error saving template: {ex.Message}" });
            }
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
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> DeleteTemplate(int id)
        {
            try
            {
                var template = await _context.ReportTemplates
                    .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

                if (template == null)
                {
                    return NotFound(new { message = "Report template not found." });
                }

                // Soft delete
                template.IsDeleted = true;
                template.DeletedAt = DateTime.Now;
                template.DeletedBy = "current-username"; // Get from authentication context

                await _context.SaveChangesAsync();

                return Ok(new { message = "Report template deleted successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
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

        public class SharedUser
        {
            [JsonPropertyName("id")]
            public string Id { get; set; }

            [JsonPropertyName("name")]
            public string Name { get; set; }

            [JsonPropertyName("type")]
            public string Type { get; set; }

            [JsonPropertyName("email")]
            public string Email { get; set; }
        }


        private List<FormSubmission> ApplyFilters(
    List<ReportFilter> filters,
    List<FormSubmission> submissions,
    Dictionary<string, string> runtimeValues)
        {
            foreach (var filter in filters)
            {
                var field = filter.FieldLabel;

                if (!runtimeValues.TryGetValue(field, out var rawValue) || string.IsNullOrWhiteSpace(rawValue))
                    continue;

                var op = filter.Operator;
                var value = rawValue;

                var multipleValues = value.Split(',', StringSplitOptions.RemoveEmptyEntries)
                                          .Select(v => v.Trim())
                                          .Where(v => !string.IsNullOrWhiteSpace(v))
                                          .ToList();

                submissions = submissions.Where(sub =>
                {
                    // Handle grid field reference (gridFieldId:columnId)
                    if (field.Contains(':'))
                    {
                        var parts = field.Split(':', StringSplitOptions.RemoveEmptyEntries);
                        if (parts.Length >= 2 &&
                            Guid.TryParse(parts[0], out Guid gridFieldId) &&
                            Guid.TryParse(parts[1], out Guid columnId))
                        {
                            // Find the grid field data
                            var gridFieldData = sub.SubmissionData.FirstOrDefault(d =>
                                Guid.TryParse(d.FieldLabel, out Guid fieldGuid) && fieldGuid == gridFieldId);

                            if (gridFieldData == null || string.IsNullOrWhiteSpace(gridFieldData.FieldValue))
                                return false;

                            try
                            {
                                // Get the column name from the grid field definition
                                var columnName = GetColumnNameById(gridFieldId, columnId);
                                if (string.IsNullOrEmpty(columnName))
                                    return false;

                                // Parse the grid data as JSON array
                                var gridRows = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(gridFieldData.FieldValue);
                                if (gridRows == null || !gridRows.Any())
                                    return false;

                                // Check if any row in the grid matches the filter condition
                                return gridRows.Any(row =>
                                {
                                    if (!row.ContainsKey(columnName))
                                        return false;

                                    var cellValue = row[columnName]?.ToString();
                                    if (string.IsNullOrWhiteSpace(cellValue))
                                        return false;

                                    return ApplyOperatorCondition(cellValue, op, multipleValues);
                                });
                            }
                            catch (JsonException)
                            {
                                return false;
                            }
                        }
                    }
                    else
                    {
                        // Handle regular field reference
                        var match = sub.SubmissionData.FirstOrDefault(d => d.FieldLabel == field);
                        if (match == null || string.IsNullOrWhiteSpace(match.FieldValue))
                            return false;

                        return ApplyOperatorCondition(match.FieldValue, op, multipleValues);
                    }

                    return false;
                }).ToList();
            }

            return submissions;
        }

        // Helper method to get column name by ID
        private string GetColumnNameById(Guid gridFieldId, Guid columnId)
        {
            var gridField = _context.FormFields
                .FirstOrDefault(ff => ff.Id == gridFieldId && ff.Type.ToLower() == "grid");

            if (gridField?.Columns != null)
            {
                var column = gridField.Columns.FirstOrDefault(c =>
                    Guid.TryParse(c.Id, out Guid colGuid) && colGuid == columnId);

                return column?.Name; // This should return "Model No", "Working Hour", etc.
            }

            return null;
        }

        // Extract the operator logic into a separate method for reuse
        private bool ApplyOperatorCondition(string fieldValue, string op, List<string> multipleValues)
        {
            switch (op)
            {
                case "equals":
                case "in":
                    return multipleValues.Any(val => fieldValue.Equals(val, StringComparison.OrdinalIgnoreCase));

                case "notIn":
                    return !multipleValues.Any(val => fieldValue.Equals(val, StringComparison.OrdinalIgnoreCase));

                case "contains":
                    return multipleValues.Any(val => fieldValue.IndexOf(val, StringComparison.OrdinalIgnoreCase) >= 0);

                case "greaterThan":
                    return double.TryParse(fieldValue, out var n1) &&
                           double.TryParse(multipleValues.FirstOrDefault(), out var n2) && n1 > n2;

                case "lessThan":
                    return double.TryParse(fieldValue, out var m1) &&
                           double.TryParse(multipleValues.FirstOrDefault(), out var m2) && m1 < m2;

                case "between":
                    if (multipleValues.Count == 2 &&
                        DateTime.TryParse(multipleValues[0], out var start) &&
                        DateTime.TryParse(multipleValues[1], out var end) &&
                        DateTime.TryParse(fieldValue, out var actual))
                    {
                        return actual >= start && actual <= end;
                    }
                    return false;

                case "containsAny":
                    return multipleValues.Any(val =>
                        fieldValue.IndexOf(val, StringComparison.OrdinalIgnoreCase) >= 0);

                case "containsAll":
                    return multipleValues.All(val =>
                        fieldValue.IndexOf(val, StringComparison.OrdinalIgnoreCase) >= 0);

                default:
                    return true;
            }
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

            // Separate regular field IDs and grid field references
            var regularFieldIds = new List<Guid>();
            var gridFieldIds = new List<Guid>();

            foreach (var filter in template.Filters.Where(f => !string.IsNullOrEmpty(f.FieldLabel)))
            {
                // Check if it's a grid field reference (contains colon)
                if (filter.FieldLabel.Contains(':'))
                {
                    // Extract grid field ID (first part before colon)
                    var parts = filter.FieldLabel.Split(':', StringSplitOptions.RemoveEmptyEntries);
                    if (parts.Length >= 2 && Guid.TryParse(parts[0], out Guid gridFieldId))
                    {
                        gridFieldIds.Add(gridFieldId);
                    }
                }
                else
                {
                    // Regular field reference
                    if (Guid.TryParse(filter.FieldLabel, out Guid fieldId))
                    {
                        regularFieldIds.Add(fieldId);
                    }
                }
            }

            // Get regular form fields
            var formFields = await _context.FormFields
                .Where(ff => regularFieldIds.Contains(ff.Id))
                .ToDictionaryAsync(ff => ff.Id, ff => ff);

            // Get grid form fields
            var gridFormFields = await _context.FormFields
                .Where(ff => gridFieldIds.Contains(ff.Id) && ff.Type.ToLower() == "grid")
                .ToDictionaryAsync(ff => ff.Id, ff => ff);

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
                filters = template.Filters.Select(filter =>
                {
                    FormField formField = null;
                    List<string> options = null;
                    string fieldType = null;

                    if (!string.IsNullOrEmpty(filter.FieldLabel))
                    {
                        // Handle grid field reference (gridFieldId:columnId)
                        if (filter.FieldLabel.Contains(':'))
                        {
                            var parts = filter.FieldLabel.Split(':', StringSplitOptions.RemoveEmptyEntries);
                            if (parts.Length >= 2 &&
                                Guid.TryParse(parts[0], out Guid gridFieldId) &&
                                Guid.TryParse(parts[1], out Guid columnId))
                            {
                                if (gridFormFields.TryGetValue(gridFieldId, out var gridField) &&
                                    gridField.Columns != null)
                                {
                                    // Find the specific column in the grid
                                    var column = gridField.Columns.FirstOrDefault(c =>
                                        Guid.TryParse(c.Id, out Guid colGuid) && colGuid == columnId);

                                    if (column != null)
                                    {
                                        fieldType = column.Type?.ToLower();

                                        // Extract options for dropdown, checkbox, or radio columns
                                        if ((fieldType == "dropdown" || fieldType == "checkbox" || fieldType == "radio") &&
                                            column.Options != null && column.Options.Any())
                                        {
                                            options = column.Options;
                                        }
                                    }
                                }
                            }
                        }
                        // Handle regular field reference
                        else if (Guid.TryParse(filter.FieldLabel, out Guid fieldId))
                        {
                            if (formFields.TryGetValue(fieldId, out formField))
                            {
                                fieldType = formField.Type?.ToLower();

                                // Extract options for dropdown, checkbox, or radio fields
                                if ((fieldType == "dropdown" || fieldType == "checkbox" || fieldType == "radio") &&
                                    !string.IsNullOrEmpty(formField.OptionsJson))
                                {
                                    options = JsonSerializer.Deserialize<List<string>>(formField.OptionsJson);
                                }
                            }
                        }
                    }

                    return new
                    {
                        filter.Id,
                        filter.FieldLabel,
                        filter.Operator,
                        filter.Value,
                        filter.Type,
                        // Add options data for dropdown, checkbox, and radio filters
                        options = options,
                        // Add field type information for frontend rendering
                        fieldType = fieldType
                    };
                }).ToList(),
                sharedWithRole = !string.IsNullOrEmpty(template.SharedWithRole)
                    ? JsonSerializer.Deserialize<List<SharedUser>>(template.SharedWithRole)
                    : new List<SharedUser>(),
                calculatedFields = !string.IsNullOrEmpty(template.CalculatedFields)
                    ? JsonSerializer.Deserialize<List<CalculatedField>>(template.CalculatedFields)
                    : new List<CalculatedField>(),
                chartConfig = !string.IsNullOrEmpty(template.ChartConfig)
                    ? JsonSerializer.Deserialize<List<ChartConfig>>(template.ChartConfig)
                    : new List<ChartConfig>()
            });
        }


        [HttpGet("list")]
        public async Task<IActionResult> GetReportsList(string username, bool includeShared = true)
        {
            try
            {
                var query = _context.ReportTemplates
    .AsQueryable();

                // Filter reports based on user access
                var reports = await query
                    .Where(r => r.CreatedBy == username ||
                               (r.SharedWithRole != null &&
                                r.SharedWithRole.Contains($"\"name\":\"{username}\"")))
                    .Select(r => new
                    {
                        r.Id,
                        r.Name,
                        r.SharedWithRole,
                        r.IncludeRemarks,
                        r.CreatedBy,
                        CreatedAt = r.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
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
