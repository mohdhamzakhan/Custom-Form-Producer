using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class Correction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AuditPlanEntries_AuditPlans_AuditPlanId",
                table: "AuditPlanEntries");

            migrationBuilder.DropForeignKey(
                name: "FK_AuditPlanEntryNotifications_AuditPlanEntries_AuditPlanEntryId",
                table: "AuditPlanEntryNotifications");

            migrationBuilder.DropPrimaryKey(
                name: "PK_AuditPlans",
                table: "AuditPlans");

            migrationBuilder.DropPrimaryKey(
                name: "PK_AuditPlanEntryNotifications",
                table: "AuditPlanEntryNotifications");

            migrationBuilder.DropPrimaryKey(
                name: "PK_AuditPlanEntries",
                table: "AuditPlanEntries");

            migrationBuilder.RenameTable(
                name: "AuditPlans",
                newName: "FF_AUDITPLAN");

            migrationBuilder.RenameTable(
                name: "AuditPlanEntryNotifications",
                newName: "FF_AUDITPLANENTRYNOTIFICATION");

            migrationBuilder.RenameTable(
                name: "AuditPlanEntries",
                newName: "FF_AUDITPLANENTRY");

            migrationBuilder.RenameColumn(
                name: "UpdatedBy",
                table: "FF_AUDITPLAN",
                newName: "UPDATEDBY");

            migrationBuilder.RenameColumn(
                name: "UpdatedAt",
                table: "FF_AUDITPLAN",
                newName: "UPDATEDAT");

            migrationBuilder.RenameColumn(
                name: "Status",
                table: "FF_AUDITPLAN",
                newName: "STATUS");

            migrationBuilder.RenameColumn(
                name: "StartDate",
                table: "FF_AUDITPLAN",
                newName: "STARTDATE");

            migrationBuilder.RenameColumn(
                name: "PlanName",
                table: "FF_AUDITPLAN",
                newName: "PLANNAME");

            migrationBuilder.RenameColumn(
                name: "EndDate",
                table: "FF_AUDITPLAN",
                newName: "ENDDATE");

            migrationBuilder.RenameColumn(
                name: "DurationType",
                table: "FF_AUDITPLAN",
                newName: "DURATIONTYPE");

            migrationBuilder.RenameColumn(
                name: "Description",
                table: "FF_AUDITPLAN",
                newName: "DESCRIPTION");

            migrationBuilder.RenameColumn(
                name: "CreatedBy",
                table: "FF_AUDITPLAN",
                newName: "CREATEDBY");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "FF_AUDITPLAN",
                newName: "CREATEDAT");

            migrationBuilder.RenameColumn(
                name: "ApproverName",
                table: "FF_AUDITPLAN",
                newName: "APPROVERNAME");

            migrationBuilder.RenameColumn(
                name: "ApproverEmail",
                table: "FF_AUDITPLAN",
                newName: "APPROVEREMAIL");

            migrationBuilder.RenameColumn(
                name: "ApproverAdObjectId",
                table: "FF_AUDITPLAN",
                newName: "APPROVERADOBJECTID");

            migrationBuilder.RenameColumn(
                name: "ApprovedBy",
                table: "FF_AUDITPLAN",
                newName: "APPROVEDBY");

            migrationBuilder.RenameColumn(
                name: "ApprovedAt",
                table: "FF_AUDITPLAN",
                newName: "APPROVEDAT");

            migrationBuilder.RenameColumn(
                name: "ApprovalComments",
                table: "FF_AUDITPLAN",
                newName: "APPROVALCOMMENTS");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "FF_AUDITPLAN",
                newName: "ID");

            migrationBuilder.RenameColumn(
                name: "Status",
                table: "FF_AUDITPLANENTRYNOTIFICATION",
                newName: "STATUS");

            migrationBuilder.RenameColumn(
                name: "SentAt",
                table: "FF_AUDITPLANENTRYNOTIFICATION",
                newName: "SENTAT");

            migrationBuilder.RenameColumn(
                name: "ScheduledFor",
                table: "FF_AUDITPLANENTRYNOTIFICATION",
                newName: "SCHEDULEDFOR");

            migrationBuilder.RenameColumn(
                name: "ReminderType",
                table: "FF_AUDITPLANENTRYNOTIFICATION",
                newName: "REMINDERTYPE");

            migrationBuilder.RenameColumn(
                name: "HangfireJobId",
                table: "FF_AUDITPLANENTRYNOTIFICATION",
                newName: "HANGFIREJOBID");

            migrationBuilder.RenameColumn(
                name: "AuditPlanEntryId",
                table: "FF_AUDITPLANENTRYNOTIFICATION",
                newName: "AUDITPLANENTRYID");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "FF_AUDITPLANENTRYNOTIFICATION",
                newName: "ID");

            migrationBuilder.RenameIndex(
                name: "IX_AuditPlanEntryNotifications_AuditPlanEntryId",
                table: "FF_AUDITPLANENTRYNOTIFICATION",
                newName: "IX_FF_AUDITPLANENTRYNOTIFICATION_AUDITPLANENTRYID");

            migrationBuilder.RenameColumn(
                name: "Title",
                table: "FF_AUDITPLANENTRY",
                newName: "TITLE");

            migrationBuilder.RenameColumn(
                name: "Status",
                table: "FF_AUDITPLANENTRY",
                newName: "STATUS");

            migrationBuilder.RenameColumn(
                name: "Scope",
                table: "FF_AUDITPLANENTRY",
                newName: "SCOPE");

            migrationBuilder.RenameColumn(
                name: "ScheduledDate",
                table: "FF_AUDITPLANENTRY",
                newName: "SCHEDULEDDATE");

            migrationBuilder.RenameColumn(
                name: "ReminderJobId",
                table: "FF_AUDITPLANENTRY",
                newName: "REMINDERJOBID");

            migrationBuilder.RenameColumn(
                name: "ReminderDaysBefore",
                table: "FF_AUDITPLANENTRY",
                newName: "REMINDERDAYSBEFORE");

            migrationBuilder.RenameColumn(
                name: "HangfireJobId",
                table: "FF_AUDITPLANENTRY",
                newName: "HANGFIREJOBID");

            migrationBuilder.RenameColumn(
                name: "Frequency",
                table: "FF_AUDITPLANENTRY",
                newName: "FREQUENCY");

            migrationBuilder.RenameColumn(
                name: "Department",
                table: "FF_AUDITPLANENTRY",
                newName: "DEPARTMENT");

            migrationBuilder.RenameColumn(
                name: "CompletionRemarks",
                table: "FF_AUDITPLANENTRY",
                newName: "COMPLETIONREMARKS");

            migrationBuilder.RenameColumn(
                name: "CompletedAt",
                table: "FF_AUDITPLANENTRY",
                newName: "COMPLETEDAT");

            migrationBuilder.RenameColumn(
                name: "ClosedBy",
                table: "FF_AUDITPLANENTRY",
                newName: "CLOSEDBY");

            migrationBuilder.RenameColumn(
                name: "AuditorName",
                table: "FF_AUDITPLANENTRY",
                newName: "AUDITORNAME");

            migrationBuilder.RenameColumn(
                name: "AuditorId",
                table: "FF_AUDITPLANENTRY",
                newName: "AUDITORID");

            migrationBuilder.RenameColumn(
                name: "AuditorEmail",
                table: "FF_AUDITPLANENTRY",
                newName: "AUDITOREMAIL");

            migrationBuilder.RenameColumn(
                name: "AuditeeName",
                table: "FF_AUDITPLANENTRY",
                newName: "AUDITEENAME");

            migrationBuilder.RenameColumn(
                name: "AuditeeId",
                table: "FF_AUDITPLANENTRY",
                newName: "AUDITEEID");

            migrationBuilder.RenameColumn(
                name: "AuditeeEmail",
                table: "FF_AUDITPLANENTRY",
                newName: "AUDITEEEMAIL");

            migrationBuilder.RenameColumn(
                name: "AuditType",
                table: "FF_AUDITPLANENTRY",
                newName: "AUDITTYPE");

            migrationBuilder.RenameColumn(
                name: "AuditPlanId",
                table: "FF_AUDITPLANENTRY",
                newName: "AUDITPLANID");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "FF_AUDITPLANENTRY",
                newName: "ID");

            migrationBuilder.RenameIndex(
                name: "IX_AuditPlanEntries_AuditPlanId",
                table: "FF_AUDITPLANENTRY",
                newName: "IX_FF_AUDITPLANENTRY_AUDITPLANID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_FF_AUDITPLAN",
                table: "FF_AUDITPLAN",
                column: "ID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_FF_AUDITPLANENTRYNOTIFICATION",
                table: "FF_AUDITPLANENTRYNOTIFICATION",
                column: "ID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_FF_AUDITPLANENTRY",
                table: "FF_AUDITPLANENTRY",
                column: "ID");

            migrationBuilder.AddForeignKey(
                name: "FK_FF_AUDITPLANENTRY_FF_AUDITPLAN_AUDITPLANID",
                table: "FF_AUDITPLANENTRY",
                column: "AUDITPLANID",
                principalTable: "FF_AUDITPLAN",
                principalColumn: "ID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_FF_AUDITPLANENTRYNOTIFICATION_FF_AUDITPLANENTRY_AUDITPLANENTRYID",
                table: "FF_AUDITPLANENTRYNOTIFICATION",
                column: "AUDITPLANENTRYID",
                principalTable: "FF_AUDITPLANENTRY",
                principalColumn: "ID",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FF_AUDITPLANENTRY_FF_AUDITPLAN_AUDITPLANID",
                table: "FF_AUDITPLANENTRY");

            migrationBuilder.DropForeignKey(
                name: "FK_FF_AUDITPLANENTRYNOTIFICATION_FF_AUDITPLANENTRY_AUDITPLANENTRYID",
                table: "FF_AUDITPLANENTRYNOTIFICATION");

            migrationBuilder.DropPrimaryKey(
                name: "PK_FF_AUDITPLANENTRYNOTIFICATION",
                table: "FF_AUDITPLANENTRYNOTIFICATION");

            migrationBuilder.DropPrimaryKey(
                name: "PK_FF_AUDITPLANENTRY",
                table: "FF_AUDITPLANENTRY");

            migrationBuilder.DropPrimaryKey(
                name: "PK_FF_AUDITPLAN",
                table: "FF_AUDITPLAN");

            migrationBuilder.RenameTable(
                name: "FF_AUDITPLANENTRYNOTIFICATION",
                newName: "AuditPlanEntryNotifications");

            migrationBuilder.RenameTable(
                name: "FF_AUDITPLANENTRY",
                newName: "AuditPlanEntries");

            migrationBuilder.RenameTable(
                name: "FF_AUDITPLAN",
                newName: "AuditPlans");

            migrationBuilder.RenameColumn(
                name: "STATUS",
                table: "AuditPlanEntryNotifications",
                newName: "Status");

            migrationBuilder.RenameColumn(
                name: "SENTAT",
                table: "AuditPlanEntryNotifications",
                newName: "SentAt");

            migrationBuilder.RenameColumn(
                name: "SCHEDULEDFOR",
                table: "AuditPlanEntryNotifications",
                newName: "ScheduledFor");

            migrationBuilder.RenameColumn(
                name: "REMINDERTYPE",
                table: "AuditPlanEntryNotifications",
                newName: "ReminderType");

            migrationBuilder.RenameColumn(
                name: "HANGFIREJOBID",
                table: "AuditPlanEntryNotifications",
                newName: "HangfireJobId");

            migrationBuilder.RenameColumn(
                name: "AUDITPLANENTRYID",
                table: "AuditPlanEntryNotifications",
                newName: "AuditPlanEntryId");

            migrationBuilder.RenameColumn(
                name: "ID",
                table: "AuditPlanEntryNotifications",
                newName: "Id");

            migrationBuilder.RenameIndex(
                name: "IX_FF_AUDITPLANENTRYNOTIFICATION_AUDITPLANENTRYID",
                table: "AuditPlanEntryNotifications",
                newName: "IX_AuditPlanEntryNotifications_AuditPlanEntryId");

            migrationBuilder.RenameColumn(
                name: "TITLE",
                table: "AuditPlanEntries",
                newName: "Title");

            migrationBuilder.RenameColumn(
                name: "STATUS",
                table: "AuditPlanEntries",
                newName: "Status");

            migrationBuilder.RenameColumn(
                name: "SCOPE",
                table: "AuditPlanEntries",
                newName: "Scope");

            migrationBuilder.RenameColumn(
                name: "SCHEDULEDDATE",
                table: "AuditPlanEntries",
                newName: "ScheduledDate");

            migrationBuilder.RenameColumn(
                name: "REMINDERJOBID",
                table: "AuditPlanEntries",
                newName: "ReminderJobId");

            migrationBuilder.RenameColumn(
                name: "REMINDERDAYSBEFORE",
                table: "AuditPlanEntries",
                newName: "ReminderDaysBefore");

            migrationBuilder.RenameColumn(
                name: "HANGFIREJOBID",
                table: "AuditPlanEntries",
                newName: "HangfireJobId");

            migrationBuilder.RenameColumn(
                name: "FREQUENCY",
                table: "AuditPlanEntries",
                newName: "Frequency");

            migrationBuilder.RenameColumn(
                name: "DEPARTMENT",
                table: "AuditPlanEntries",
                newName: "Department");

            migrationBuilder.RenameColumn(
                name: "COMPLETIONREMARKS",
                table: "AuditPlanEntries",
                newName: "CompletionRemarks");

            migrationBuilder.RenameColumn(
                name: "COMPLETEDAT",
                table: "AuditPlanEntries",
                newName: "CompletedAt");

            migrationBuilder.RenameColumn(
                name: "CLOSEDBY",
                table: "AuditPlanEntries",
                newName: "ClosedBy");

            migrationBuilder.RenameColumn(
                name: "AUDITTYPE",
                table: "AuditPlanEntries",
                newName: "AuditType");

            migrationBuilder.RenameColumn(
                name: "AUDITPLANID",
                table: "AuditPlanEntries",
                newName: "AuditPlanId");

            migrationBuilder.RenameColumn(
                name: "AUDITORNAME",
                table: "AuditPlanEntries",
                newName: "AuditorName");

            migrationBuilder.RenameColumn(
                name: "AUDITORID",
                table: "AuditPlanEntries",
                newName: "AuditorId");

            migrationBuilder.RenameColumn(
                name: "AUDITOREMAIL",
                table: "AuditPlanEntries",
                newName: "AuditorEmail");

            migrationBuilder.RenameColumn(
                name: "AUDITEENAME",
                table: "AuditPlanEntries",
                newName: "AuditeeName");

            migrationBuilder.RenameColumn(
                name: "AUDITEEID",
                table: "AuditPlanEntries",
                newName: "AuditeeId");

            migrationBuilder.RenameColumn(
                name: "AUDITEEEMAIL",
                table: "AuditPlanEntries",
                newName: "AuditeeEmail");

            migrationBuilder.RenameColumn(
                name: "ID",
                table: "AuditPlanEntries",
                newName: "Id");

            migrationBuilder.RenameIndex(
                name: "IX_FF_AUDITPLANENTRY_AUDITPLANID",
                table: "AuditPlanEntries",
                newName: "IX_AuditPlanEntries_AuditPlanId");

            migrationBuilder.RenameColumn(
                name: "UPDATEDBY",
                table: "AuditPlans",
                newName: "UpdatedBy");

            migrationBuilder.RenameColumn(
                name: "UPDATEDAT",
                table: "AuditPlans",
                newName: "UpdatedAt");

            migrationBuilder.RenameColumn(
                name: "STATUS",
                table: "AuditPlans",
                newName: "Status");

            migrationBuilder.RenameColumn(
                name: "STARTDATE",
                table: "AuditPlans",
                newName: "StartDate");

            migrationBuilder.RenameColumn(
                name: "PLANNAME",
                table: "AuditPlans",
                newName: "PlanName");

            migrationBuilder.RenameColumn(
                name: "ENDDATE",
                table: "AuditPlans",
                newName: "EndDate");

            migrationBuilder.RenameColumn(
                name: "DURATIONTYPE",
                table: "AuditPlans",
                newName: "DurationType");

            migrationBuilder.RenameColumn(
                name: "DESCRIPTION",
                table: "AuditPlans",
                newName: "Description");

            migrationBuilder.RenameColumn(
                name: "CREATEDBY",
                table: "AuditPlans",
                newName: "CreatedBy");

            migrationBuilder.RenameColumn(
                name: "CREATEDAT",
                table: "AuditPlans",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "APPROVERNAME",
                table: "AuditPlans",
                newName: "ApproverName");

            migrationBuilder.RenameColumn(
                name: "APPROVEREMAIL",
                table: "AuditPlans",
                newName: "ApproverEmail");

            migrationBuilder.RenameColumn(
                name: "APPROVERADOBJECTID",
                table: "AuditPlans",
                newName: "ApproverAdObjectId");

            migrationBuilder.RenameColumn(
                name: "APPROVEDBY",
                table: "AuditPlans",
                newName: "ApprovedBy");

            migrationBuilder.RenameColumn(
                name: "APPROVEDAT",
                table: "AuditPlans",
                newName: "ApprovedAt");

            migrationBuilder.RenameColumn(
                name: "APPROVALCOMMENTS",
                table: "AuditPlans",
                newName: "ApprovalComments");

            migrationBuilder.RenameColumn(
                name: "ID",
                table: "AuditPlans",
                newName: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_AuditPlanEntryNotifications",
                table: "AuditPlanEntryNotifications",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_AuditPlanEntries",
                table: "AuditPlanEntries",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_AuditPlans",
                table: "AuditPlans",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_AuditPlanEntries_AuditPlans_AuditPlanId",
                table: "AuditPlanEntries",
                column: "AuditPlanId",
                principalTable: "AuditPlans",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_AuditPlanEntryNotifications_AuditPlanEntries_AuditPlanEntryId",
                table: "AuditPlanEntryNotifications",
                column: "AuditPlanEntryId",
                principalTable: "AuditPlanEntries",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
