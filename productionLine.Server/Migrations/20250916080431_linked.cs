using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class linked : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "KEY_FIELD_MAPPINGS",
                table: "FF_FORMFIELD",
                type: "CLOB",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LINKED_FIELD_ID",
                table: "FF_FORMFIELD",
                type: "RAW(16)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LINKED_FORM_ID",
                table: "FF_FORMFIELD",
                type: "NUMBER(10)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "KEY_FIELD_MAPPINGS",
                table: "FF_FORM",
                type: "CLOB",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LINKED_FORM_ID",
                table: "FF_FORM",
                type: "NUMBER(10)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "KEY_FIELD_MAPPINGS",
                table: "FF_FORMFIELD");

            migrationBuilder.DropColumn(
                name: "LINKED_FIELD_ID",
                table: "FF_FORMFIELD");

            migrationBuilder.DropColumn(
                name: "LINKED_FORM_ID",
                table: "FF_FORMFIELD");

            migrationBuilder.DropColumn(
                name: "KEY_FIELD_MAPPINGS",
                table: "FF_FORM");

            migrationBuilder.DropColumn(
                name: "LINKED_FORM_ID",
                table: "FF_FORM");
        }
    }
}
