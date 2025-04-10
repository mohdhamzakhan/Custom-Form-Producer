using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class approval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FF_FORMAPPROVER_FF_FORM_FORMID",
                table: "FF_FORMAPPROVER");

            migrationBuilder.RenameColumn(
                name: "FORMID",
                table: "FF_FORMAPPROVER",
                newName: "FormId");

            migrationBuilder.RenameIndex(
                name: "IX_FF_FORMAPPROVER_FORMID",
                table: "FF_FORMAPPROVER",
                newName: "IX_FF_FORMAPPROVER_FormId");

            migrationBuilder.AddForeignKey(
                name: "FK_FF_FORMAPPROVER_FF_FORM_FormId",
                table: "FF_FORMAPPROVER",
                column: "FormId",
                principalTable: "FF_FORM",
                principalColumn: "ID",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FF_FORMAPPROVER_FF_FORM_FormId",
                table: "FF_FORMAPPROVER");

            migrationBuilder.RenameColumn(
                name: "FormId",
                table: "FF_FORMAPPROVER",
                newName: "FORMID");

            migrationBuilder.RenameIndex(
                name: "IX_FF_FORMAPPROVER_FormId",
                table: "FF_FORMAPPROVER",
                newName: "IX_FF_FORMAPPROVER_FORMID");

            migrationBuilder.AddForeignKey(
                name: "FK_FF_FORMAPPROVER_FF_FORM_FORMID",
                table: "FF_FORMAPPROVER",
                column: "FORMID",
                principalTable: "FF_FORM",
                principalColumn: "ID",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
