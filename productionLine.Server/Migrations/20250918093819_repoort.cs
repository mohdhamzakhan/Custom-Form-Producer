using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class repoort : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DELETEDAT",
                table: "FF_REPORTTEMPLATE",
                type: "TIMESTAMP(7)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DELETEDBY",
                table: "FF_REPORTTEMPLATE",
                type: "NVARCHAR2(2000)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ISDELETE",
                table: "FF_REPORTTEMPLATE",
                type: "NUMBER(1)",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DELETEDAT",
                table: "FF_REPORTTEMPLATE");

            migrationBuilder.DropColumn(
                name: "DELETEDBY",
                table: "FF_REPORTTEMPLATE");

            migrationBuilder.DropColumn(
                name: "ISDELETE",
                table: "FF_REPORTTEMPLATE");
        }
    }
}
