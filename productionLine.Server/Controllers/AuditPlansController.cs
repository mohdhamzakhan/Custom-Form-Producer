using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using productionLine.Server.DTO.AuditPlan;
using productionLine.Server.Model;
using productionLine.Server.Service;

[Route("api/audit-plans")]
[ApiController]
public class AuditPlansController : ControllerBase
{
    private readonly FormDbContext _db;
    private readonly IAuditPlanService _service;

    public AuditPlansController(FormDbContext db, IAuditPlanService service)
    {
        _db = db;
        _service = service;
    }

    // ── GET ALL ───────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 15)
    {
        var query = _db.AuditPlans
            .Include(p => p.Entries)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(p => p.Status == status);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(p =>
                p.PlanName.Contains(search) ||
                (p.Description != null && p.Description.Contains(search)));

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new AuditPlanListDto
            {
                Id = p.Id,
                PlanName = p.PlanName,
                Description = p.Description,
                DurationType = p.DurationType,
                StartDate = p.StartDate,
                EndDate = p.EndDate,
                Status = p.Status,
                ApproverName = p.ApproverName,
                ApproverEmail = p.ApproverEmail,
                ApproverAdObjectId = p.ApproverAdObjectId,
                TotalAudits = p.Entries.Count,
                CompletedAudits = p.Entries.Count(e => e.Status == "Completed"),
                CreatedAt = p.CreatedAt,
                CreatedBy = p.CreatedBy,
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, items });
    }

    // ── GET ONE ───────────────────────────────────────────────────
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var p = await _db.AuditPlans
            .Include(x => x.Entries)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (p == null) return NotFound();

        return Ok(new AuditPlanDetailDto
        {
            Id = p.Id,
            PlanName = p.PlanName,
            Description = p.Description,
            DurationType = p.DurationType,
            StartDate = p.StartDate,
            EndDate = p.EndDate,
            Status = p.Status,
            ApproverAdObjectId = p.ApproverAdObjectId,
            ApproverName = p.ApproverName,
            ApproverEmail = p.ApproverEmail,
            ApprovalComments = p.ApprovalComments,
            ApprovedBy = p.ApprovedBy,
            ApprovedAt = p.ApprovedAt,
            Approver = p.ApproverAdObjectId == null ? null : new PersonDto
            {
                Id = p.ApproverAdObjectId,
                Name = p.ApproverName!,
                Email = p.ApproverEmail,
            },
            CreatedAt = p.CreatedAt,
            CreatedBy = p.CreatedBy,
            Entries = p.Entries.Select(MapEntryToDto).ToList(),
        });
    }

    // ── GET ENTRIES (for calendar) ────────────────────────────────
    [HttpGet("{id:int}/entries")]
    public async Task<IActionResult> GetEntries(int id)
    {
        var entries = await _db.AuditPlanEntries
            .Where(e => e.AuditPlanId == id)
            .OrderBy(e => e.ScheduledDate)
            .ToListAsync();

        return Ok(entries.Select(MapEntryToDto));
    }

    // ── CREATE ────────────────────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AuditPlanCreateDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var currentUser = dto.userName ?? "system";
        var plan = await _service.CreatePlanAsync(dto, currentUser);
        return CreatedAtAction(nameof(GetById), new { id = plan.Id }, new { id = plan.Id });
    }

    // ── UPDATE ────────────────────────────────────────────────────
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] AuditPlanCreateDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var existing = await _db.AuditPlans
            .Include(p => p.Entries)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (existing == null) return NotFound();
        if (existing.Status != "Draft" && existing.Status != "Rejected")
            return BadRequest("Only Draft or Rejected plans can be edited.");

        var currentUser = dto.userName ?? "system";
        await _service.UpdatePlanAsync(existing, dto, currentUser);
        return NoContent();
    }

    // ── DELETE ────────────────────────────────────────────────────
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeletePlanAsync(id);
        return NoContent();
    }

    // ── APPROVAL ─────────────────────────────────────────────────
    //  Enforces that ONLY the designated approver can approve/reject.
    //  Matches on Windows identity name OR email claim (whichever your
    //  auth middleware populates — works for Windows Auth, JWT, and OIDC).
    [HttpPatch("{id:int}/approval")]
    public async Task<IActionResult> SetApproval(int id, [FromBody] ApprovalDto dto)
    {
        var plan = await _db.AuditPlans
            .Include(p => p.Entries)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (plan == null) return NotFound();
        if (plan.Status != "Pending")
            return BadRequest("Only Pending plans can be approved/rejected.");

        // ── Who is the logged-in user? ────────────────────────────────
        var currentUserName = User.Identity?.Name ?? "";
        var currentUserEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value
                            ?? User.FindFirst("preferred_username")?.Value
                            ?? "";

        // ── Is this the designated approver? ─────────────────────────
        var isDesignatedApprover =
            (!string.IsNullOrEmpty(plan.ApproverName) &&
              plan.ApproverName.Equals(currentUserName, StringComparison.OrdinalIgnoreCase))
            ||
            (!string.IsNullOrEmpty(plan.ApproverEmail) &&
              plan.ApproverEmail.Equals(currentUserEmail, StringComparison.OrdinalIgnoreCase));

        if (!isDesignatedApprover)
            return StatusCode(403, new
            {
                error = "Only the designated approver can approve or reject this plan.",
                designatedApprover = plan.ApproverName,
                designatedEmail = plan.ApproverEmail,
            });

        // ── Require a reason when rejecting ──────────────────────────
        if (!dto.Approved && string.IsNullOrWhiteSpace(dto.Comments))
            return BadRequest("A rejection reason (Comments) is required.");

        await _service.ProcessApprovalAsync(plan, dto.Approved, currentUserName, dto.Comments);
        return NoContent();
    }

    // ── MARK ENTRY COMPLETE ───────────────────────────────────────
    [HttpPatch("entries/{entryId:int}/complete")]
    public async Task<IActionResult> MarkEntryComplete(int entryId)
    {
        var entry = await _db.AuditPlanEntries.FindAsync(entryId);
        if (entry == null) return NotFound();

        await _service.MarkEntryCompleteAsync(entry);
        return NoContent();
    }

    // ── HELPER ───────────────────────────────────────────────────
    private static AuditPlanEntryDto MapEntryToDto(AuditPlanEntry e) => new()
    {
        Id = e.Id,
        AuditPlanId = e.AuditPlanId,
        Title = e.Title,
        AuditType = e.AuditType,
        Department = e.Department,
        AuditorId = e.AuditorId,
        AuditorName = e.AuditorName,
        AuditorEmail = e.AuditorEmail,
        AuditeeId = e.AuditeeId,
        AuditeeName = e.AuditeeName,
        AuditeeEmail = e.AuditeeEmail,
        ScheduledDate = e.ScheduledDate,
        Frequency = e.Frequency,
        ReminderDaysBefore = e.ReminderDaysBefore,
        Scope = e.Scope,
        Status = e.Status,
        CompletedAt = e.CompletedAt,
        HangfireJobId = e.HangfireJobId,
        ReminderJobId = e.ReminderJobId,
    };
}
