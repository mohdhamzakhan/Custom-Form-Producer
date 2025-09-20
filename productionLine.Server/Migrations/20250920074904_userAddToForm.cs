using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class userAddToForm : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CREATEDAT",
                table: "FF_FORM",
                type: "TIMESTAMP(7)",
                nullable: true,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "CREATEDBY",
                table: "FF_FORM",
                type: "NVARCHAR2(2000)",
                nullable: true,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CREATEDAT",
                table: "FF_FORM");

            migrationBuilder.DropColumn(
                name: "CREATEDBY",
                table: "FF_FORM");
        }
    }
}
