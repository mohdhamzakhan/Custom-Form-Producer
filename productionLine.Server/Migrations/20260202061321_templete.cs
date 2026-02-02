using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class templete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FORMID1",
                table: "FF_REPORTTEMPLATE",
                type: "NUMBER(10)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FORMRELATIONSHIPS",
                table: "FF_REPORTTEMPLATE",
                type: "NVARCHAR2(2000)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_FF_REPORTTEMPLATE_FORMID1",
                table: "FF_REPORTTEMPLATE",
                column: "FORMID1");

            migrationBuilder.AddForeignKey(
                name: "FK_FF_REPORTTEMPLATE_FF_FORM_FORMID1",
                table: "FF_REPORTTEMPLATE",
                column: "FORMID1",
                principalTable: "FF_FORM",
                principalColumn: "ID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FF_REPORTTEMPLATE_FF_FORM_FORMID1",
                table: "FF_REPORTTEMPLATE");

            migrationBuilder.DropIndex(
                name: "IX_FF_REPORTTEMPLATE_FORMID1",
                table: "FF_REPORTTEMPLATE");

            migrationBuilder.DropColumn(
                name: "FORMID1",
                table: "FF_REPORTTEMPLATE");

            migrationBuilder.DropColumn(
                name: "FORMRELATIONSHIPS",
                table: "FF_REPORTTEMPLATE");
        }
    }
}
