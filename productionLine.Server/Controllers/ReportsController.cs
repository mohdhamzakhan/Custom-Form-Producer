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
                return BadRequest(ModelState);  // Logs why it fails

            if (string.IsNullOrWhiteSpace(dto.Name) || dto.Fields.Count == 0)
                return BadRequest("Template name and at least one field are required.");

            var template = new ReportTemplate
            {
                FormId = dto.FormId,
                Name = dto.Name,
                CreatedBy = dto.CreatedBy ?? "system",
                CreatedAt = DateTime.UtcNow,
                IncludeApprovals = dto.IncludeApprovals,
                IncludeRemarks = dto.IncludeRemarks,
                SharedWithRole = dto.SharedWithRole,
                Fields = dto.Fields.Select((f, index) => new ReportField
                {
                    FieldLabel = f.FieldLabel,
                    Order = index,

                }).ToList(),
                Filters = dto.Filters.Select(f => new ReportFilter
                {
                    FieldLabel = f.FieldLabel,
                    Operator = f.Operator,
                    Value = f.Value
                
                }).ToList()
            };

            _context.ReportTemplates.Add(template);
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

            var formSubmissions = await _context.FormSubmissions
                .Where(s => s.FormId == template.FormId)
                .Include(s => s.SubmissionData)
                .ToListAsync();

            // 👇 Pass runtime filter values
            var filtered = ApplyFilters(template.Filters, formSubmissions, runtimeValues);

            var result = filtered.Select(sub => new
            {
                submissionId = sub.Id,
                submittedAt = sub.SubmittedAt,
                data = template.Fields.Select(field => new
                {
                    fieldLabel = field.FieldLabel,
                    value = sub.SubmissionData.FirstOrDefault(d => d.FieldLabel == field.FieldLabel)?.FieldValue
                })
            });

            return Ok(result);
        }

        private List<FormSubmission> ApplyFilters(
     List<ReportFilter> filters,
     List<FormSubmission> submissions,
     Dictionary<string, string> runtimeValues)
        {
            foreach (var filter in filters)
            {
                string actualValue = runtimeValues.ContainsKey(filter.FieldLabel)
                    ? runtimeValues[filter.FieldLabel]
                    : filter.Value;

                if (filter.Operator == "between" && (filter.Type == "date" || string.IsNullOrEmpty(filter.Type)) && actualValue.Contains(","))
                {
                    var parts = actualValue.Split(',');
                    if (DateTime.TryParse(parts[0], out var start) && DateTime.TryParse(parts[1], out var end))
                    {
                        submissions = submissions
                            .Where(s => s.SubmissionData.Any(d =>
                                d.FieldLabel == filter.FieldLabel &&
                                DateTime.TryParse(d.FieldValue, out var val) &&
                                val >= start && val <= end)).ToList();
                    }
                }

                else if (filter.Operator == "equals")
                {
                    submissions = submissions
                        .Where(s => s.SubmissionData.Any(d =>
                            d.FieldLabel == filter.FieldLabel &&
                            d.FieldValue == actualValue)).ToList();
                }
                else if (filter.Operator == "contains")
                {
                    submissions = submissions
                        .Where(s => s.SubmissionData.Any(d =>
                            d.FieldLabel == filter.FieldLabel &&
                            d.FieldValue != null &&
                            d.FieldValue.Contains(actualValue))).ToList();
                }
            }

            return submissions;
        }

        [HttpGet("template/{templateId}")]
        public async Task<IActionResult> GetTemplate(int templateId)
        {
            var template = await _context.ReportTemplates
                .Include(t => t.Fields)
                .Include(t => t.Filters)
                .FirstOrDefaultAsync(t => t.Id == templateId);

            if (template == null)
                return NotFound("Template not found.");

            return Ok(new
            {
                fields = template.Fields,
                filters = template.Filters
            });
        }
    }
}
