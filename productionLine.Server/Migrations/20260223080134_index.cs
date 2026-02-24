using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class index : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_SUBMDATA_FIELDLABEL_SUBID",
                table: "FF_FORMSUBMISSIONDATA",
                columns: new[] { "FIELDLABEL", "FORMSUBMISSIONID" });

            migrationBuilder.CreateIndex(
                name: "IX_FORMSUBMISSIONS_FORMID_DATE",
                table: "FF_FORMSUBMISSION",
                columns: new[] { "FORMID", "SUBMITTEDAT" });

            migrationBuilder.CreateIndex(
                name: "IX_FORMSUBMISSIONS_FORMID_DATE_ID",
                table: "FF_FORMSUBMISSION",
                columns: new[] { "FORMID", "SUBMITTEDAT", "ID" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SUBMDATA_FIELDLABEL_SUBID",
                table: "FF_FORMSUBMISSIONDATA");

            migrationBuilder.DropIndex(
                name: "IX_FORMSUBMISSIONS_FORMID_DATE",
                table: "FF_FORMSUBMISSION");

            migrationBuilder.DropIndex(
                name: "IX_FORMSUBMISSIONS_FORMID_DATE_ID",
                table: "FF_FORMSUBMISSION");

            migrationBuilder.AlterColumn<string>(
                name: "FIELDLABEL",
                table: "FF_FORMSUBMISSIONDATA",
                type: "NVARCHAR2(2000)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "NVARCHAR2(450)");

            migrationBuilder.CreateIndex(
                name: "IX_FF_FORMSUBMISSION_FORMID",
                table: "FF_FORMSUBMISSION",
                column: "FORMID");
        }
    }
}
