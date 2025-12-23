using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddVisibleToReportField : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "VISIBLE",
                table: "FF_REPORTFIELD",
                type: "NUMBER(1)",
                nullable: false,
                defaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VISIBLE",
                table: "FF_REPORTFIELD");
        }
    }
}
