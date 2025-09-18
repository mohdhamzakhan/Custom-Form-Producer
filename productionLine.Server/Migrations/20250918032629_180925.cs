using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class _180925 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ALLOW_MANUAL_ENTRY",
                table: "FF_FORMFIELD",
                type: "NUMBER(1)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DISPLAY_FORMAT",
                table: "FF_FORMFIELD",
                type: "NVARCHAR2(2000)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DISPLAY_MODE",
                table: "FF_FORMFIELD",
                type: "NVARCHAR2(2000)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "SHOW_LOOKUP_BUTTON",
                table: "FF_FORMFIELD",
                type: "NUMBER(1)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ALLOW_MANUAL_ENTRY",
                table: "FF_FORMFIELD");

            migrationBuilder.DropColumn(
                name: "DISPLAY_FORMAT",
                table: "FF_FORMFIELD");

            migrationBuilder.DropColumn(
                name: "DISPLAY_MODE",
                table: "FF_FORMFIELD");

            migrationBuilder.DropColumn(
                name: "SHOW_LOOKUP_BUTTON",
                table: "FF_FORMFIELD");
        }
    }
}
