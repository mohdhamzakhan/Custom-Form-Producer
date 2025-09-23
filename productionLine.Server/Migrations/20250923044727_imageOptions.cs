using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class imageOptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IMAGEOPTIONS",
                table: "FF_FORMFIELD",
                type: "CLOB",
                nullable: true);

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IMAGEOPTIONS",
                table: "FF_FORMFIELD");

            migrationBuilder.AlterColumn<string>(
                name: "CREATEDBY",
                table: "FF_FORM",
                type: "NVARCHAR2(2000)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "NVARCHAR2(2000)",
                oldNullable: true);
        }
    }
}
