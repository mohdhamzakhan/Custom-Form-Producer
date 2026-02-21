using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using productionLine.Server.DTO;
using productionLine.Server.Migrations;
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

                double totalDowntime = 0;
                int failureCount = 0;

                foreach (var sub in submissions)
                {
                    var downtimeField = sub.SubmissionData.FirstOrDefault(d => d.FieldLabel == "Downtime");
                    if (downtimeField != null && double.TryParse(downtimeField.FieldValue, out var downtimeMinutes))
                    {
                        totalDowntime += downtimeMinutes;
                        failureCount++;
                    }
                }

                var mttr = failureCount > 0 ? (totalDowntime / failureCount) / 60.0 : 0;
                var mttb = failureCount > 0 ? (1440.0 / failureCount) / 60.0 : 0;
                var mttf = failureCount > 0 ? (1440.0 / failureCount) / 60.0 : 0;

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
                    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
                    PropertyNameCaseInsensitive = true
                };

                Console.WriteLine("Received ChartConfigs: " +
                    (dto.ChartConfigs != null ? JsonSerializer.Serialize(dto.ChartConfigs, jsonOptions) : "null"));

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

                    // ✅ NEW: Store multiple form IDs for multi-form reports
                    template.FormIds = dto.FormIds != null && dto.FormIds.Any()
                        ? JsonSerializer.Serialize(dto.FormIds, jsonOptions)
                        : null;

                    // ✅ NEW: Store multi-form flag
                    template.IsMultiForm = dto.IsMultiForm;

                    template.IncludeApprovals = dto.IncludeApprovals;
                    template.IncludeRemarks = dto.IncludeRemarks;
                    template.SharedWithRole = dto.SharedWithRole;
                    template.LayoutMode = dto.LayoutMode;

                    _context.ReportFields.RemoveRange(template.Fields);
                    _context.ReportFilters.RemoveRange(template.Filters);

                    template.Fields = dto.Fields.Select((f, index) => new ReportField
                    {
                        FieldId = f.FieldId,
                        FieldLabel = f.FieldLabel,
                        Order = index,
                        Visible = f.Visible ?? true,
                        FormId = f.FormId  // ✅ NEW: Store which form this field belongs to
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

                    template.GroupingConfig = dto.GroupingConfig?.Any() == true
                        ? JsonSerializer.Serialize(dto.GroupingConfig, jsonOptions)
                        : null;

                    template.FormRelationships = dto.FormRelationships?.Any() == true
                        ? JsonSerializer.Serialize(dto.FormRelationships, jsonOptions)
                        : null;
                }
                else
                {
                    // --- CREATE NEW ---
                    template = new ReportTemplate
                    {
                        Name = dto.Name,
                        FormId = dto.FormId,

                        // ✅ NEW: Store multiple form IDs
                        FormIds = dto.FormIds != null && dto.FormIds.Any()
                            ? JsonSerializer.Serialize(dto.FormIds, jsonOptions)
                            : null,

                        // ✅ NEW: Store multi-form flag
                        IsMultiForm = dto.IsMultiForm,

                        CreatedBy = dto.CreatedBy ?? "system",
                        CreatedAt = DateTime.Now,
                        IncludeApprovals = dto.IncludeApprovals,
                        IncludeRemarks = dto.IncludeRemarks,
                        SharedWithRole = dto.SharedWithRole,
                        LayoutMode = dto.LayoutMode,
                        Fields = dto.Fields.Select((f, index) => new ReportField
                        {
                            FieldId = f.FieldId,
                            FieldLabel = f.FieldLabel,
                            Order = index,
                            Visible = f.Visible ?? true,
                            FormId = f.FormId  // ✅ NEW: Store which form this field belongs to
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
                            : null,

                        GroupingConfig = dto.GroupingConfig?.Any() == true
                            ? JsonSerializer.Serialize(dto.GroupingConfig, jsonOptions)
                            : null,

                        FormRelationships = dto.FormRelationships?.Any() == true
                            ? JsonSerializer.Serialize(dto.FormRelationships, jsonOptions)
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
        public async Task<IActionResult> RunReport(int templateId, [FromBody] RunReportRequest request)
        {
            var template = await _context.ReportTemplates
                .Include(t => t.Fields)
                .Include(t => t.Filters)
                .FirstOrDefaultAsync(t => t.Id == templateId);

            if (template == null)
                return NotFound("Template not found.");

            // ✅ NEW: Check report layout mode
            bool isVerticalLayout = request.VerticalLayout ?? false;

            List<int> formIds = new List<int>();

            if (template.IsMultiForm && !string.IsNullOrEmpty(template.FormIds))
            {
                try
                {
                    formIds = JsonSerializer.Deserialize<List<int>>(template.FormIds);
                }
                catch
                {
                    formIds = new List<int> { template.FormId };
                }
            }
            else
            {
                formIds = new List<int> { template.FormId };
            }

            var allSubmissions = new List<FormSubmission>();
            var formFieldMappings = new Dictionary<int, List<FormField>>();

            foreach (var formId in formIds)
            {
                var form = await _context.Forms
                    .Include(f => f.Fields)
                    .FirstOrDefaultAsync(f => f.Id == formId);

                if (form == null) continue;

                formFieldMappings[formId] = form.Fields.ToList();

                var formSubmissions = await _context.FormSubmissions
                    .Include(s => s.Approvals)
                    .Include(s => s.SubmissionData)
                    .Where(s => s.FormId == formId && s.Approvals.Any(a => a.Status == "Approved"))
                    .ToListAsync();

                allSubmissions.AddRange(formSubmissions);
            }

            var filtered = ApplyFilters(template.Filters, allSubmissions, request.RuntimeFilters ?? new Dictionary<string, string>());

            // ✅ NEW: Choose layout processing
            if (isVerticalLayout)
            {
                return Ok(ProcessVerticalLayout(filtered, template, formFieldMappings));
            }
            else
            {
                return Ok(ProcessHorizontalLayout(filtered, template, formFieldMappings));
            }
        }

        // ✅ NEW: Process vertical layout (stacked columns)
        private List<object> ProcessVerticalLayout(
     List<FormSubmission> submissions,
     ReportTemplate template,
     Dictionary<int, List<FormField>> formFieldMappings)
        {
            var result = new List<object>();

            // ✅ FIX: Group template fields by their LABEL (not by Order)
            // This ensures "Auditor Name" from Form A, Form B, Form C all map to one column
            var fieldsByLabel = template.Fields
                .GroupBy(f => f.FieldLabel)
                .ToDictionary(g => g.Key, g => g.ToList());

            // ✅ Get unique column labels (one per unique field label)
            var columnLabels = fieldsByLabel.Keys.OrderBy(k =>
                template.Fields.First(f => f.FieldLabel == k).Order
            ).ToList();

            Console.WriteLine($"📊 Vertical Layout: {columnLabels.Count} unique columns");
            Console.WriteLine($"📋 Columns: {string.Join(", ", columnLabels)}");

            // ✅ Get form names for display
            var formNames = new Dictionary<int, string>();
            foreach (var formId in formFieldMappings.Keys)
            {
                var form = _context.Forms.FirstOrDefault(f => f.Id == formId);
                if (form != null)
                {
                    formNames[formId] = form.Name;
                }
            }

            // ✅ Process each submission
            foreach (var sub in submissions)
            {
                var formFields = formFieldMappings.ContainsKey(sub.FormId)
                    ? formFieldMappings[sub.FormId]
                    : new List<FormField>();

                var rowData = new List<object>();

                // ✅ For each unique column, find the matching field from THIS submission's form
                foreach (var columnLabel in columnLabels)
                {
                    // Find the template field for this label that belongs to this submission's form
                    var reportField = fieldsByLabel[columnLabel].FirstOrDefault(f =>
                        f.FormId == null || f.FormId == 0 || f.FormId == sub.FormId
                    );

                    if (reportField == null)
                    {
                        // No field from this form for this column
                        rowData.Add(new
                        {
                            fieldLabel = columnLabel,
                            value = "-",
                            fieldType = "text",
                            visible = true
                        });
                        continue;
                    }

                    // ✅ Get the actual data from submission
                    var formField = formFields.FirstOrDefault(f => f.Label == reportField.FieldLabel);
                    var match = formField != null
                        ? sub.SubmissionData.FirstOrDefault(d => d.FieldLabel == formField.Id.ToString())
                        : null;

                    rowData.Add(new
                    {
                        fieldLabel = columnLabel, // ✅ Use unified column name
                        value = match?.FieldValue ?? "-",
                        fieldType = formField?.Type ?? "text",
                        visible = reportField.Visible
                    });
                }

                result.Add(new
                {
                    submissionId = sub.Id,
                    submittedAt = sub.SubmittedAt,
                    formId = sub.FormId,
                    formName = formNames.ContainsKey(sub.FormId)
                        ? formNames[sub.FormId]
                        : $"Form {sub.FormId}",
                    data = rowData
                });
            }

            Console.WriteLine($"✅ Vertical layout processed: {result.Count} rows with {columnLabels.Count} columns each");
            return result;
        }

        // ✅ EXISTING: Keep horizontal layout (original behavior)
        private List<object> ProcessHorizontalLayout(
            List<FormSubmission> submissions,
            ReportTemplate template,
            Dictionary<int, List<FormField>> formFieldMappings)
        {
            var result = new List<object>();

            foreach (var sub in submissions)
            {
                var formFields = formFieldMappings.ContainsKey(sub.FormId)
                    ? formFieldMappings[sub.FormId]
                    : new List<FormField>();

                var relevantFields = template.Fields.Where(f =>
                    f.FormId == null || f.FormId == 0 || f.FormId == sub.FormId
                ).ToList();

                var hasGridFields = relevantFields.Any(f => f.FieldLabel.Contains("→"));

                if (hasGridFields)
                {
                    var gridData = GetExpandedGridData(sub, relevantFields, formFields);
                    result.AddRange(gridData);
                }
                else
                {
                    var singleRow = CreateSingleRow(sub, relevantFields, formFields);
                    result.Add(singleRow);
                }
            }

            return result;
        }

        // ✅ NEW: Request DTO
        public class RunReportRequest
        {
            public Dictionary<string, string> RuntimeFilters { get; set; }
            public bool? VerticalLayout { get; set; } // New property
        }
        private List<object> GetExpandedGridData(FormSubmission sub, ICollection<ReportField> reportFields, List<FormField> formFields)
        {
            var result = new List<object>();

            var gridFieldGroups = reportFields
                .Where(f => f.FieldLabel.Contains("→"))
                .GroupBy(f => f.FieldLabel.Split("→")[0].Trim())
                .ToList();

            var normalFields = reportFields.Where(f => !f.FieldLabel.Contains("→")).ToList();

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
                    continue;
                }
            }

            for (int rowIndex = 0; rowIndex < maxRowCount; rowIndex++)
            {
                var rowData = new List<object>();

                foreach (var field in normalFields)
                {
                    rowData.Add(new
                    {
                        fieldLabel = field.FieldLabel,
                        value = normalValues.ContainsKey(field.FieldLabel) ? normalValues[field.FieldLabel] : "-",
                        visible = field.Visible
                    });
                }

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
                            value = value,
                            visible = field.Visible
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

                template.IsDeleted = true;
                template.DeletedAt = DateTime.Now;
                template.DeletedBy = "current-username";

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
                        value = value,
                        visible = reportField.Visible
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
                    if (field.Contains(':'))
                    {
                        var parts = field.Split(':', StringSplitOptions.RemoveEmptyEntries);
                        if (parts.Length >= 2 &&
                            Guid.TryParse(parts[0], out Guid gridFieldId) &&
                            Guid.TryParse(parts[1], out Guid columnId))
                        {
                            var gridFieldData = sub.SubmissionData.FirstOrDefault(d =>
                                Guid.TryParse(d.FieldLabel, out Guid fieldGuid) && fieldGuid == gridFieldId);

                            if (gridFieldData == null || string.IsNullOrWhiteSpace(gridFieldData.FieldValue))
                                return false;

                            try
                            {
                                var columnName = GetColumnNameById(gridFieldId, columnId);
                                if (string.IsNullOrEmpty(columnName))
                                    return false;

                                var gridRows = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(gridFieldData.FieldValue);
                                if (gridRows == null || !gridRows.Any())
                                    return false;

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

        private string GetColumnNameById(Guid gridFieldId, Guid columnId)
        {
            var gridField = _context.FormFields
                .FirstOrDefault(ff => ff.Id == gridFieldId && ff.Type.ToLower() == "grid");

            if (gridField?.Columns != null)
            {
                var column = gridField.Columns.FirstOrDefault(c =>
                    Guid.TryParse(c.Id, out Guid colGuid) && colGuid == columnId);

                return column?.Name;
            }

            return null;
        }

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

            var regularFieldIds = new List<Guid>();
            var gridFieldIds = new List<Guid>();

            foreach (var filter in template.Filters.Where(f => !string.IsNullOrEmpty(f.FieldLabel)))
            {
                if (filter.FieldLabel.Contains(':'))
                {
                    var parts = filter.FieldLabel.Split(':', StringSplitOptions.RemoveEmptyEntries);
                    if (parts.Length >= 2 && Guid.TryParse(parts[0], out Guid gridFieldId))
                    {
                        gridFieldIds.Add(gridFieldId);
                    }
                }
                else
                {
                    if (Guid.TryParse(filter.FieldLabel, out Guid fieldId))
                    {
                        regularFieldIds.Add(fieldId);
                    }
                }
            }

            var formFields = await _context.FormFields
                .Where(ff => regularFieldIds.Contains(ff.Id))
                .ToDictionaryAsync(ff => ff.Id, ff => ff);

            var gridFormFields = await _context.FormFields
                .Where(ff => gridFieldIds.Contains(ff.Id) && ff.Type.ToLower() == "grid")
                .ToDictionaryAsync(ff => ff.Id, ff => ff);

            try
            {
                // ✅ NEW: Parse form IDs for multi-form reports
                List<int> formIds = new List<int> { template.FormId };
                if (template.IsMultiForm && !string.IsNullOrEmpty(template.FormIds))
                {
                    try
                    {
                        formIds = JsonSerializer.Deserialize<List<int>>(template.FormIds);
                    }
                    catch
                    {
                        // Fall back to single form
                    }
                }

                return Ok(new
                {
                    id = template.Id,
                    name = template.Name,
                    formId = template.FormId,
                    layoutMode = template.LayoutMode,
                    formIds = formIds,  // ✅ NEW: Return all form IDs
                    isMultiForm = template.IsMultiForm,  // ✅ NEW: Return multi-form flag
                    fields = template.Fields.Select(f => new
                    {
                        f.Id,
                        f.FieldId,
                        f.FieldLabel,
                        f.Order,
                        f.Visible,
                        f.FormId  // ✅ NEW: Include form ID for each field
                    }).ToList(),
                    filters = template.Filters.Select(filter =>
                    {
                        FormField formField = null;
                        List<string> options = null;
                        string fieldType = null;

                        if (!string.IsNullOrEmpty(filter.FieldLabel))
                        {
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
                                        var column = gridField.Columns.FirstOrDefault(c =>
                                            Guid.TryParse(c.Id, out Guid colGuid) && colGuid == columnId);

                                        if (column != null)
                                        {
                                            fieldType = column.Type?.ToLower();

                                            if ((fieldType == "dropdown" || fieldType == "checkbox" || fieldType == "radio") &&
                                                column.Options != null && column.Options.Any())
                                            {
                                                options = column.Options;
                                            }
                                        }
                                    }
                                }
                            }
                            else if (Guid.TryParse(filter.FieldLabel, out Guid fieldId))
                            {
                                if (formFields.TryGetValue(fieldId, out formField))
                                {
                                    fieldType = formField.Type?.ToLower();

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
                            options = options,
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
                        : new List<ChartConfig>(),
                    groupingConfig = !string.IsNullOrEmpty(template.GroupingConfig)
                        ? JsonSerializer.Deserialize<List<GroupingConfig>>(template.GroupingConfig)
                        : new List<GroupingConfig>(),
                    formRelationships = !string.IsNullOrEmpty(template.FormRelationships)
                        ? JsonSerializer.Deserialize<List<FormRelationship>>(template.FormRelationships)
                        : new List<FormRelationship>(),
                });
            }
            catch (Exception ex)
            {
                return NotFound();
            }
        }

        [HttpGet("list")]
        public async Task<IActionResult> GetReportsList(string username, bool includeShared = true)
        {
            try
            {
                var query = _context.ReportTemplates.AsQueryable();

                var reports = await query
                        .Where(r =>
    !r.IsDeleted &&  // Assumes IsDeleted is non-nullable bool
    (r.CreatedBy.ToLower() == username.ToLower() ||
     (r.SharedWithRole != null &&
      r.SharedWithRole.ToLower().Contains($"\"name\":\"{username.ToLower()}\"")))
)
                        .Select(r => new
                        {
                            r.Id,
                            r.Name,
                            r.SharedWithRole,
                            r.IncludeRemarks,
                            r.CreatedBy,
                            CreatedAt = r.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                            r.FormId,
                            r.IsMultiForm,
                            FormIds = r.FormIds
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

        [HttpPost("run-shift/{templateId}")]
        public async Task<IActionResult> RunShiftReport(int templateId, [FromBody] ShiftReportRequest request)
        {
            var template = await _context.ReportTemplates
                .Include(t => t.Fields)
                .Include(t => t.Filters)
                .FirstOrDefaultAsync(t => t.Id == templateId);

            if (template == null)
                return NotFound("Template not found.");

            DateTime targetDate = DateTime.Today;
            if (!string.IsNullOrEmpty(request.Date))
            {
                if (DateTime.TryParse(request.Date, out DateTime parsedDate))
                {
                    targetDate = parsedDate.Date;
                }
            }

            DateTime startDate, endDate;
            string shiftLetter = request.ShiftPeriod;

            if (request.ShiftPeriod == "current")
            {
                shiftLetter = GetCurrentShift();
            }

            if (request.ShiftPeriod == "fullday")
            {
                startDate = targetDate;
                endDate = targetDate.AddDays(1);
            }
            else
            {
                var shiftTimes = GetShiftTimeRange(shiftLetter);
                startDate = targetDate.Add(shiftTimes.start);
                endDate = targetDate.Add(shiftTimes.end);

                if (shiftTimes.end < shiftTimes.start)
                {
                    endDate = endDate.AddDays(1);
                }
            }

            // ✅ NEW: Support multi-form shift reports
            List<int> formIds = new List<int>();

            if (template.IsMultiForm && !string.IsNullOrEmpty(template.FormIds))
            {
                try
                {
                    formIds = JsonSerializer.Deserialize<List<int>>(template.FormIds);
                }
                catch
                {
                    formIds = new List<int> { template.FormId };
                }
            }
            else
            {
                formIds = new List<int> { template.FormId };
            }

            var allSubmissions = new List<FormSubmission>();

            foreach (var formId in formIds)
            {
                var submissions = await _context.FormSubmissions
                    .Include(s => s.SubmissionData)
                    .Include(s => s.Approvals)
                    .Where(s => s.FormId == formId &&
                               s.SubmittedAt >= startDate &&
                               s.SubmittedAt < endDate &&
                               s.Approvals.Any(a => a.Status == "Approved"))
                    .OrderBy(s => s.SubmittedAt)
                    .ToListAsync();

                allSubmissions.AddRange(submissions);
            }

            var result = new List<object>();

            foreach (var sub in allSubmissions)
            {
                // ✅ NEW: Filter fields by submission's form
                var relevantFields = template.Fields.Where(f =>
                    f.FormId == null ||
                    f.FormId == 0 ||
                    f.FormId == sub.FormId
                ).ToList();

                var rowData = relevantFields.Select(reportField =>
                {
                    var formField = _context.FormFields
                        .FirstOrDefault(f => f.Label == reportField.FieldLabel);

                    var match = formField != null
                        ? sub.SubmissionData.FirstOrDefault(d => d.FieldLabel == formField.Id.ToString())
                        : null;

                    return new
                    {
                        fieldLabel = reportField.FieldLabel,
                        value = match?.FieldValue ?? "-",
                        fieldType = "text"
                    };
                }).ToList();

                rowData.Add(new
                {
                    fieldLabel = "Date",
                    value = sub.SubmittedAt.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                    fieldType = "date"
                });

                result.Add(new
                {
                    submissionId = sub.Id,
                    submittedAt = sub.SubmittedAt,
                    data = rowData
                });
            }

            return Ok(result);
        }

        private (TimeSpan start, TimeSpan end) GetShiftTimeRange(string shift)
        {
            return shift switch
            {
                "A" => (new TimeSpan(6, 0, 0), new TimeSpan(14, 30, 0)),
                "B" => (new TimeSpan(14, 30, 0), new TimeSpan(23, 0, 0)),
                "C" => (new TimeSpan(23, 0, 0), new TimeSpan(6, 0, 0)),
                _ => (new TimeSpan(6, 0, 0), new TimeSpan(14, 30, 0))
            };
        }

        private string GetCurrentShift()
        {
            var now = DateTime.Now;
            var currentTime = now.TimeOfDay;

            if (currentTime >= new TimeSpan(6, 0, 0) && currentTime < new TimeSpan(14, 30, 0))
                return "A";

            if (currentTime >= new TimeSpan(14, 30, 0) && currentTime < new TimeSpan(23, 0, 0))
                return "B";

            return "C";
        }

        public class ShiftReportRequest
        {
            public string ShiftPeriod { get; set; }
            public string Date { get; set; }
        }
    }
}