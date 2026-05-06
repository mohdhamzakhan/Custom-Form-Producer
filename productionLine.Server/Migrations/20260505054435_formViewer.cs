using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class formViewer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ACCESSLEVEL",
                table: "FF_FORMACCESS",
                type: "NVARCHAR2(2000)",
                nullable: false,
                defaultValue: "Editor");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ACCESSLEVEL",
                table: "FF_FORMACCESS");
        }
    }
}
