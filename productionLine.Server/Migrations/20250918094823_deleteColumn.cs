using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class deleteColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ISDELETE",
                table: "FF_REPORTTEMPLATE");

            migrationBuilder.AddColumn<bool>(
                name: "ISDELETE",
                table: "FF_REPORTTEMPLATE",
                type: "NUMBER(1)",
                nullable: false,
                defaultValue: "0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
