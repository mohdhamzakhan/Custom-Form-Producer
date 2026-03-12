using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class auditSchedular : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AuditPlans",
                columns: table => new
                {
                    Id = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    PlanName = table.Column<string>(type: "NVARCHAR2(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    DurationType = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    StartDate = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    EndDate = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    ApproverAdObjectId = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    ApproverName = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    ApproverEmail = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    Status = table.Column<string>(type: "NVARCHAR2(20)", maxLength: 20, nullable: false),
                    CreatedBy = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    UpdatedBy = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    ApprovedBy = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditPlans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AuditPlanEntries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    AuditPlanId = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    Title = table.Column<string>(type: "NVARCHAR2(300)", maxLength: 300, nullable: false),
                    AuditType = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    Department = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    Scope = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    AuditorId = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    AuditorName = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    AuditorEmail = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    AuditeeId = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    AuditeeName = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    AuditeeEmail = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    ScheduledDate = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    Frequency = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    ReminderDaysBefore = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    Status = table.Column<string>(type: "NVARCHAR2(20)", maxLength: 20, nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: true),
                    HangfireJobId = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    ReminderJobId = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditPlanEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AuditPlanEntries_AuditPlans_AuditPlanId",
                        column: x => x.AuditPlanId,
                        principalTable: "AuditPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuditPlanEntries_AuditPlanId",
                table: "AuditPlanEntries",
                column: "AuditPlanId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditPlanEntries");

            migrationBuilder.DropTable(
                name: "AuditPlans");
        }
    }
}
