using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class AuditReminderStages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ClosedBy",
                table: "AuditPlanEntries",
                type: "NVARCHAR2(2000)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompletionRemarks",
                table: "AuditPlanEntries",
                type: "NVARCHAR2(2000)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AuditPlanEntryNotifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    AuditPlanEntryId = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    ReminderType = table.Column<string>(type: "NVARCHAR2(30)", maxLength: 30, nullable: false),
                    ScheduledFor = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    SentAt = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: true),
                    Status = table.Column<string>(type: "NVARCHAR2(20)", maxLength: 20, nullable: false),
                    HangfireJobId = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditPlanEntryNotifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AuditPlanEntryNotifications_AuditPlanEntries_AuditPlanEntryId",
                        column: x => x.AuditPlanEntryId,
                        principalTable: "AuditPlanEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuditPlanEntryNotifications_AuditPlanEntryId",
                table: "AuditPlanEntryNotifications",
                column: "AuditPlanEntryId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditPlanEntryNotifications");

            migrationBuilder.DropColumn(
                name: "ClosedBy",
                table: "AuditPlanEntries");

            migrationBuilder.DropColumn(
                name: "CompletionRemarks",
                table: "AuditPlanEntries");
        }
    }
}
