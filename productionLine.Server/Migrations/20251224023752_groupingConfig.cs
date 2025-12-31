using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class groupingConfig : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GROUPINGCONFIG",
                table: "FF_REPORTTEMPLATE",
                type: "CLOB",
                nullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "VISIBLE",
                table: "FF_REPORTFIELD",
                type: "NUMBER(1)",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "BOOLEAN");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GROUPINGCONFIG",
                table: "FF_REPORTTEMPLATE");

            migrationBuilder.AlterColumn<bool>(
                name: "VISIBLE",
                table: "FF_REPORTFIELD",
                type: "BOOLEAN",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "NUMBER(1)");
        }
    }
}
