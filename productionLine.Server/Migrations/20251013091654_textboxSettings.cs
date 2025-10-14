using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class textboxSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MAXLENGTH",
                table: "FF_FORMFIELD",
                type: "NUMBER(10)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MESSAGE",
                table: "FF_FORMFIELD",
                type: "NVARCHAR2(2000)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MINLENGTH",
                table: "FF_FORMFIELD",
                type: "NUMBER(10)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MAXLENGTH",
                table: "FF_FORMFIELD");

            migrationBuilder.DropColumn(
                name: "MESSAGE",
                table: "FF_FORMFIELD");

            migrationBuilder.DropColumn(
                name: "MINLENGTH",
                table: "FF_FORMFIELD");
        }
    }
}
