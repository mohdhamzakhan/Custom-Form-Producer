using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddOptionsSourceAndLinkedField : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LINKED_FIELD_REFERENCE",
                table: "FF_FORMFIELD",
                type: "NVARCHAR2(2000)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OPTIONS_SOURCE",
                table: "FF_FORMFIELD",
                type: "NVARCHAR2(2000)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LINKED_FIELD_REFERENCE",
                table: "FF_FORMFIELD");

            migrationBuilder.DropColumn(
                name: "OPTIONS_SOURCE",
                table: "FF_FORMFIELD");
        }
    }
}
