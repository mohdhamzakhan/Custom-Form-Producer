using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class Apprver : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FormApprovers_FF_FORM_FormId",
                table: "FormApprovers");

            migrationBuilder.DropPrimaryKey(
                name: "PK_FormApprovers",
                table: "FormApprovers");

            migrationBuilder.RenameTable(
                name: "FormApprovers",
                newName: "FF_FORMAPPROVER");

            migrationBuilder.RenameColumn(
                name: "Type",
                table: "FF_FORMAPPROVER",
                newName: "TYPE");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "FF_FORMAPPROVER",
                newName: "NAME");

            migrationBuilder.RenameColumn(
                name: "Level",
                table: "FF_FORMAPPROVER",
                newName: "LEVEL");

            migrationBuilder.RenameColumn(
                name: "FormId",
                table: "FF_FORMAPPROVER",
                newName: "FORMID");

            migrationBuilder.RenameColumn(
                name: "Email",
                table: "FF_FORMAPPROVER",
                newName: "EMAIL");

            migrationBuilder.RenameColumn(
                name: "AdObjectId",
                table: "FF_FORMAPPROVER",
                newName: "ADOBJECTID");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "FF_FORMAPPROVER",
                newName: "ID");

            migrationBuilder.RenameIndex(
                name: "IX_FormApprovers_FormId",
                table: "FF_FORMAPPROVER",
                newName: "IX_FF_FORMAPPROVER_FORMID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_FF_FORMAPPROVER",
                table: "FF_FORMAPPROVER",
                column: "ID");

            migrationBuilder.AddForeignKey(
                name: "FK_FF_FORMAPPROVER_FF_FORM_FORMID",
                table: "FF_FORMAPPROVER",
                column: "FORMID",
                principalTable: "FF_FORM",
                principalColumn: "ID",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FF_FORMAPPROVER_FF_FORM_FORMID",
                table: "FF_FORMAPPROVER");

            migrationBuilder.DropPrimaryKey(
                name: "PK_FF_FORMAPPROVER",
                table: "FF_FORMAPPROVER");

            migrationBuilder.RenameTable(
                name: "FF_FORMAPPROVER",
                newName: "FormApprovers");

            migrationBuilder.RenameColumn(
                name: "TYPE",
                table: "FormApprovers",
                newName: "Type");

            migrationBuilder.RenameColumn(
                name: "NAME",
                table: "FormApprovers",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "LEVEL",
                table: "FormApprovers",
                newName: "Level");

            migrationBuilder.RenameColumn(
                name: "FORMID",
                table: "FormApprovers",
                newName: "FormId");

            migrationBuilder.RenameColumn(
                name: "EMAIL",
                table: "FormApprovers",
                newName: "Email");

            migrationBuilder.RenameColumn(
                name: "ADOBJECTID",
                table: "FormApprovers",
                newName: "AdObjectId");

            migrationBuilder.RenameColumn(
                name: "ID",
                table: "FormApprovers",
                newName: "Id");

            migrationBuilder.RenameIndex(
                name: "IX_FF_FORMAPPROVER_FORMID",
                table: "FormApprovers",
                newName: "IX_FormApprovers_FormId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_FormApprovers",
                table: "FormApprovers",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_FormApprovers_FF_FORM_FormId",
                table: "FormApprovers",
                column: "FormId",
                principalTable: "FF_FORM",
                principalColumn: "ID",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
