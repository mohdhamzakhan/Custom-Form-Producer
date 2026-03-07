using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using productionLine.Server.DTO;
using productionLine.Server.Model;
using productionLine.Server.Service;

namespace productionLine.Server.Controllers
{
    [Route("api/email-schedules")]
    [ApiController]
    public class EmailSchedulesController : ControllerBase
    {
        private readonly FormDbContext _db;
        private readonly IEmailSchedulerService _scheduler;

        public EmailSchedulesController(
            FormDbContext db,
            IEmailSchedulerService scheduler)
        {
            _db = db;
            _scheduler = scheduler;
        }

        // ── GET ALL ────────────────────────────────────────────────────
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? status,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = _db.EmailSchedules
                .Include(s => s.Recipients)
                .Include(s => s.Attachments)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
                query = query.Where(s => s.Status == status);

            if (!string.IsNullOrEmpty(search))
                query = query.Where(s =>
                    s.Title.Contains(search) ||
                    s.Subject.Contains(search));

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(s => s.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new EmailScheduleListDto
                {
                    Id = s.Id,
                    Title = s.Title,
                    Subject = s.Subject,
                    OccurrenceType = s.OccurrenceType,
                    Status = s.Status,
                    StartDateTime = s.StartDateTime,
                    NextSendAt = s.NextSendAt,
                    LastSentAt = s.LastSentAt,
                    TotalSentCount = s.TotalSentCount,
                    RecipientCount = s.Recipients.Count,
                    AttachmentCount = s.Attachments.Count,
                    CreatedBy = s.CreatedBy,
                    CreatedAt = s.CreatedAt
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, items });
        }

        // ── GET ONE ────────────────────────────────────────────────────
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var s = await _db.EmailSchedules
                .Include(x => x.Recipients)
                .Include(x => x.Attachments)
                .Include(x => x.Logs.OrderByDescending(l => l.SentAt).Take(10))
                .FirstOrDefaultAsync(x => x.Id == id);

            if (s == null) return NotFound();

            var dto = new EmailScheduleDetailDto
            {
                Id = s.Id,
                Title = s.Title,
                Subject = s.Subject,
                Body = s.Body,
                OccurrenceType = s.OccurrenceType,
                Status = s.Status,
                StartDateTime = s.StartDateTime,
                EndDateTime = s.EndDateTime,
                CronExpression = s.CronExpression,
                RecurrenceDays = s.RecurrenceDays,
                SendTime = s.SendTime,
                NextSendAt = s.NextSendAt,
                LastSentAt = s.LastSentAt,
                TotalSentCount = s.TotalSentCount,
                RecipientCount = s.Recipients.Count,
                AttachmentCount = s.Attachments.Count,
                CreatedBy = s.CreatedBy,
                CreatedAt = s.CreatedAt,
                Recipients = s.Recipients.Select(r => new RecipientDto
                {
                    Type = r.Type,
                    Name = r.Name,
                    Email = r.Email,
                    AdObjectId = r.AdObjectId,
                    RecipientType = r.RecipientType
                }).ToList(),
                Attachments = s.Attachments.Select(a => new AttachmentDto
                {
                    Id = a.Id,
                    FileName = a.FileName,
                    FileSizeBytes = a.FileSizeBytes,
                    ContentType = a.ContentType,
                    UploadedAt = a.UploadedAt
                }).ToList(),
                RecentLogs = s.Logs.Select(l => new EmailScheduleLogDto
                {
                    Id = l.Id,
                    SentAt = l.SentAt,
                    Status = l.Status,
                    RecipientsTotal = l.RecipientsTotal,
                    RecipientsSucceeded = l.RecipientsSucceeded,
                    RecipientsFailed = l.RecipientsFailed,
                    ErrorMessage = l.ErrorMessage
                }).ToList()
            };

            return Ok(dto);
        }

        // ── CREATE ─────────────────────────────────────────────────────
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] EmailScheduleCreateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var currentUser = User.Identity?.Name ?? "system";
            var schedule = MapFromDto(dto, currentUser);

            var created = await _scheduler.CreateScheduleAsync(schedule);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, new { id = created.Id });
        }

        // ── UPDATE ─────────────────────────────────────────────────────
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] EmailScheduleUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var existing = await _db.EmailSchedules
                .Include(s => s.Recipients)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (existing == null) return NotFound();

            var currentUser = User.Identity?.Name ?? "system";

            // ── Update scalar fields ─────────────────────────────────────
            existing.Title = dto.Title;
            existing.Subject = dto.Subject;
            existing.Body = dto.Body;
            existing.OccurrenceType = dto.OccurrenceType;
            existing.StartDateTime = dto.StartDateTime;
            existing.EndDateTime = dto.EndDateTime;
            existing.CronExpression = dto.CronExpression;
            existing.RecurrenceDays = dto.RecurrenceDays;
            existing.SendTime = dto.SendTime;
            existing.UpdatedBy = currentUser;
            existing.UpdatedAt = DateTime.UtcNow;

            // ── Replace recipients (remove ALL first, then add deduped) ──
            _db.EmailScheduleRecipients.RemoveRange(existing.Recipients);

            existing.Recipients = dto.Recipients
                // Deduplicate on backend — unique by adObjectId or email per recipientType
                .GroupBy(r => $"{r.RecipientType}::{(r.AdObjectId ?? r.Email ?? r.Name ?? "").ToLower()}")
                .Select(g => g.First())
                .Select(r => new EmailScheduleRecipient
                {
                    Type = r.Type,
                    Name = r.Name,
                    Email = r.Email,
                    AdObjectId = r.AdObjectId,
                    RecipientType = r.RecipientType
                })
                .ToList();

            // ── Save everything in ONE transaction ───────────────────────
            await _db.SaveChangesAsync();

            // ── Update Hangfire job (no DB needed) ───────────────────────
            await _scheduler.UpdateScheduleAsync(existing);

            return NoContent();
        }

        // ── DELETE ─────────────────────────────────────────────────────
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _scheduler.DeleteScheduleAsync(id);
            return NoContent();
        }

        // ── STATUS PATCH ────────────────────────────────────────────────
        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> SetStatus(int id, [FromBody] StatusUpdateDto dto)
        {
            var allowed = new[] { "Active", "Paused", "Completed" };
            if (!allowed.Contains(dto.Status))
                return BadRequest($"Status must be one of: {string.Join(", ", allowed)}");

            var currentUser = User.Identity?.Name ?? "system";
            await _scheduler.SetStatusAsync(id, dto.Status, currentUser);
            return NoContent();
        }

        // ── SEND NOW ────────────────────────────────────────────────────
        [HttpPost("{id:int}/send-now")]
        public async Task<IActionResult> SendNow(int id)
        {
            try
            {
                // ❌ AnyAsync generates TRUE/FALSE — Oracle throws ORA-00904
                // var exists = await _db.EmailSchedules.AnyAsync(s => s.Id == id);

                // ✅ CountAsync works fine with Oracle
                var count = await _db.EmailSchedules
                    .CountAsync(s => s.Id == id);

                if (count == 0)
                    return NotFound(new { error = $"Schedule {id} not found." });

                await _scheduler.TriggerNowAsync(id);
                return Ok(new { message = "Send job queued successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    error = ex.Message,
                    inner = ex.InnerException?.Message,
                    type = ex.GetType().FullName
                });
            }
        }

        // ── UPLOAD ATTACHMENT ────────────────────────────────────────────
        [HttpPost("{id:int}/attachments")]
        [RequestSizeLimit(20_000_000)] // 20 MB limit
        public async Task<IActionResult> UploadAttachment(int id, IFormFile file)
        {
            var exists = await _db.EmailSchedules.AnyAsync(s => s.Id == id);
            if (!exists) return NotFound();

            if (file == null || file.Length == 0)
                return BadRequest("No file provided.");

            await using var stream = file.OpenReadStream();
            await _scheduler.AddAttachmentAsync(id, stream, file.FileName, file.ContentType);

            return Ok(new { message = "Attachment uploaded." });
        }

        // ── DELETE ATTACHMENT ────────────────────────────────────────────
        [HttpDelete("attachments/{attachmentId:int}")]
        public async Task<IActionResult> DeleteAttachment(int attachmentId)
        {
            await _scheduler.RemoveAttachmentAsync(attachmentId);
            return NoContent();
        }

        // ── GET LOGS ────────────────────────────────────────────────────
        [HttpGet("{id:int}/logs")]
        public async Task<IActionResult> GetLogs(int id, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var logs = await _db.EmailScheduleLogs
                .Where(l => l.EmailScheduleId == id)
                .OrderByDescending(l => l.SentAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(l => new EmailScheduleLogDto
                {
                    Id = l.Id,
                    SentAt = l.SentAt,
                    Status = l.Status,
                    RecipientsTotal = l.RecipientsTotal,
                    RecipientsSucceeded = l.RecipientsSucceeded,
                    RecipientsFailed = l.RecipientsFailed,
                    ErrorMessage = l.ErrorMessage
                })
                .ToListAsync();

            return Ok(logs);
        }

        // ── HELPER ─────────────────────────────────────────────────────
        private static EmailSchedule MapFromDto(EmailScheduleCreateDto dto, string createdBy)
        {
            return new EmailSchedule
            {
                Title = dto.Title,
                Subject = dto.Subject,
                Body = dto.Body,
                OccurrenceType = dto.OccurrenceType,
                StartDateTime = dto.StartDateTime,
                EndDateTime = dto.EndDateTime,
                CronExpression = dto.CronExpression,
                RecurrenceDays = dto.RecurrenceDays,
                SendTime = dto.SendTime,
                CreatedBy = createdBy,
                Recipients = dto.Recipients.Select(r => new EmailScheduleRecipient
                {
                    Type = r.Type,
                    Name = r.Name,
                    Email = r.Email,
                    AdObjectId = r.AdObjectId,
                    RecipientType = r.RecipientType
                }).ToList()
            };
        }
    }
}
