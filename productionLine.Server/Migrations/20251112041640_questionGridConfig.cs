using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class questionGridConfig : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ALLOW_ADD_ROWS",
                table: "FF_FORMFIELD",
                type: "NUMBER(1)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ALLOW_EDIT_QUESTIONS",
                table: "FF_FORMFIELD",
                type: "NUMBER(1)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DEFAULT_ROWS",
                table: "FF_FORMFIELD",
                type: "CLOB",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ALLOW_ADD_ROWS",
                table: "FF_FORMFIELD");

            migrationBuilder.DropColumn(
                name: "ALLOW_EDIT_QUESTIONS",
                table: "FF_FORMFIELD");

            migrationBuilder.DropColumn(
                name: "DEFAULT_ROWS",
                table: "FF_FORMFIELD");
        }
    }
}
