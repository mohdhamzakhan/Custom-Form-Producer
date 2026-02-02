using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class MultiFormReport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FORMIDS",
                table: "FF_REPORTTEMPLATE",
                type: "NVARCHAR2(2000)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ISMULTIFORM",
                table: "FF_REPORTTEMPLATE",
                type: "NUMBER(1)",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "FORMID",
                table: "FF_REPORTFIELD",
                type: "NUMBER(10)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FORMIDS",
                table: "FF_REPORTTEMPLATE");

            migrationBuilder.DropColumn(
                name: "ISMULTIFORM",
                table: "FF_REPORTTEMPLATE");

            migrationBuilder.DropColumn(
                name: "FORMID",
                table: "FF_REPORTFIELD");
        }
    }
}
