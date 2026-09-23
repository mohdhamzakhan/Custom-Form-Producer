using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class ReportOutputModeAndGridView : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ENABLEGRIDFORMVIEW",
                table: "FF_REPORTTEMPLATE",
                type: "NUMBER(1)",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "OUTPUTMODE",
                table: "FF_REPORTTEMPLATE",
                type: "NVARCHAR2(20)",
                maxLength: 20,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ENABLEGRIDFORMVIEW",
                table: "FF_REPORTTEMPLATE");

            migrationBuilder.DropColumn(
                name: "OUTPUTMODE",
                table: "FF_REPORTTEMPLATE");
        }
    }
}
