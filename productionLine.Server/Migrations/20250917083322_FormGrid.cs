using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class FormGrid : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LINKED_COLUMN_ID",
                table: "FF_FORMFIELD",
                type: "NVARCHAR2(2000)",
                nullable: true,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LINKED_FIELD_TYPE",
                table: "FF_FORMFIELD",
                type: "NVARCHAR2(2000)",
                nullable: true,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "LINKED_GRID_FIELD_ID",
                table: "FF_FORMFIELD",
                type: "RAW(16)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LINKED_COLUMN_ID",
                table: "FF_FORMFIELD");

            migrationBuilder.DropColumn(
                name: "LINKED_FIELD_TYPE",
                table: "FF_FORMFIELD");

            migrationBuilder.DropColumn(
                name: "LINKED_GRID_FIELD_ID",
                table: "FF_FORMFIELD");
        }
    }
}
