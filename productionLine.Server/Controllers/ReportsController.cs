using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using productionLine.Server.DTO;
using productionLine.Server.Model;
using productionLine.Server.Service;

namespace productionLine.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportsController : ControllerBase
    {
        private readonly FormDbContext _context;
        private readonly ReportService _reportService;
        public ReportsController(FormDbContext context, ReportService reportService)
        {
            _context = context;
            _reportService = reportService;
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
    }
}
