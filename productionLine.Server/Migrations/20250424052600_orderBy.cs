using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class orderBy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ORDER",
                table: "FF_FORMFIELD",
                type: "NUMBER(10)",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ORDER",
                table: "FF_FORMFIELD");
        }
    }
}
