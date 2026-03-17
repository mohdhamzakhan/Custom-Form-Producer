using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class partialFilling : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FILLEDBY",
                table: "FF_FORMFIELD",
                type: "NVARCHAR2(2000)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ALLOW_PARTIAL_FILL",
                table: "FF_FORM",
                type: "NUMBER(1)",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FILLEDBY",
                table: "FF_FORMFIELD");

            migrationBuilder.DropColumn(
                name: "ALLOW_PARTIAL_FILL",
                table: "FF_FORM");
        }
    }
}
