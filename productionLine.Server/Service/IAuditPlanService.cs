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
        Task MarkEntryCompleteAsync(AuditPlanEntry entry);

    }
}