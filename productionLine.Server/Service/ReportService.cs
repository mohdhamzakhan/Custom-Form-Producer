using Microsoft.EntityFrameworkCore;
using productionLine.Server.Model;

namespace productionLine.Server.Service
{
    public class ReportService
    {
        private readonly FormDbContext _context;
        public ReportService(FormDbContext context)
        {
            _context = context;
        }
        public async Task<List<ReportRow>> RunReportAsync(ReportRequest request)
        {

            var submissions = await _context.FormSubmissions
                .Where(fs => fs.FormId == request.FormId)
                .Where(fs => !request.FromDate.HasValue || fs.SubmittedAt >= request.FromDate)
                .Where(fs => !request.ToDate.HasValue || fs.SubmittedAt <= request.ToDate)
                .Include(fs => fs.SubmissionData)
                .Include(fs => fs.Approvals)
                .ToListAsync();

            var result = new List<ReportRow>();

            foreach (var submission in submissions)
            {
                var row = new ReportRow
                {
                    SubmittedAt = submission.SubmittedAt,
                    SubmittedBy = submission.SubmittedBy ?? "Unknown",
                };

                // Add field data
                foreach (var field in submission.SubmissionData)
                {
                    if (request.SelectedFields.Contains(field.FieldLabel))
                    {
                        row.Fields[field.FieldLabel] = field.FieldValue;
                    }
                }

                // Apply value-based filters
                if (request.Filters != null && request.Filters.Any())
                {
                    bool matchesAll = request.Filters.All(f =>
                        row.Fields.TryGetValue(f.Key, out var val) && val == f.Value); // You can extend this to support operators
                    if (!matchesAll) continue;
                }

                // Add approval info
                if (request.IncludeApprovals && submission.Approvals.Any())
                {
                    var latest = submission.Approvals.OrderByDescending(a => a.ApprovalLevel).FirstOrDefault();
                    if (latest != null)
                    {
                        row.ApprovalStatus = latest.Status;
                        row.ApprovedAt = latest.ApprovedAt;
                        row.ApproverName = latest.ApproverName;
                    }
                }

                // Add remarks (if any field requires)
                if (request.IncludeRemarks)
                {
                    row.Remarks = string.Join(" | ",
                        submission.SubmissionData
                            .Where(d => d.FieldLabel.ToLower().Contains("remark"))
                            .Select(d => $"{d.FieldLabel}: {d.FieldValue}")
                    );
                }

                result.Add(row);
            }

            return result;
        }

    }
}
