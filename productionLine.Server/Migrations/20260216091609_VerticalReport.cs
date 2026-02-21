using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class VerticalReport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            
            migrationBuilder.AddColumn<string>(
                name: "LAYOUTMODE",
                table: "FF_REPORTTEMPLATE",
                type: "NVARCHAR2(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_FF_REPORTTEMPLATE_FORMID",
                table: "FF_REPORTTEMPLATE",
                column: "FORMID");

            migrationBuilder.AddForeignKey(
                name: "FK_FF_REPORTTEMPLATE_FF_FORM_FORMID",
                table: "FF_REPORTTEMPLATE",
                column: "FORMID",
                principalTable: "FF_FORM",
                principalColumn: "ID",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FF_REPORTTEMPLATE_FF_FORM_FORMID",
                table: "FF_REPORTTEMPLATE");

            migrationBuilder.DropIndex(
                name: "IX_FF_REPORTTEMPLATE_FORMID",
                table: "FF_REPORTTEMPLATE");

            migrationBuilder.DropColumn(
                name: "LAYOUTMODE",
                table: "FF_REPORTTEMPLATE");

            migrationBuilder.AddColumn<int>(
                name: "FORMID1",
                table: "FF_REPORTTEMPLATE",
                type: "NUMBER(10)",
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
    }
}
