using productionLine.Server.DTO.AuditPlan;
using productionLine.Server.Model;

namespace productionLine.Server.Service
{
    public interface IAuditPlanService
    {
        Task<AuditPlan> CreatePlanAsync(AuditPlanCreateDto dto, string createdBy);
        Task UpdatePlanAsync(AuditPlan existing, AuditPlanCreateDto dto, string updatedBy);
        Task DeletePlanAsync(int id);
        Task ProcessApprovalAsync(AuditPlan plan, bool approved, string approvedBy, string? comments = null);

        // "Close" is the real action here — it records who closed it and with what
        // remarks, not just a status flip, and it cancels every still-pending reminder
        // stage for the entry (intimation / 7-day / 1-day / overdue), not just one job.
        Task CloseEntryAsync(AuditPlanEntry entry, string closedBy, string? remarks);
    }
}