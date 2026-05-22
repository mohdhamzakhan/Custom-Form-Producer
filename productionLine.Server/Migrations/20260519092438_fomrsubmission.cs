using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class fomrsubmission : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {

            migrationBuilder.CreateIndex(
                name: "IX_FF_FORMSUBMISSION_FORMID",
                table: "FF_FORMSUBMISSION",
                column: "FORMID");

            migrationBuilder.CreateIndex(
                name: "IX_FF_FORMSUBMISSION_SUBMITTEDBY",
                table: "FF_FORMSUBMISSION",
                column: "SUBMITTEDBY");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_FF_FORMSUBMISSION_FORMID",
                table: "FF_FORMSUBMISSION");

            migrationBuilder.DropIndex(
                name: "IX_FF_FORMSUBMISSION_SUBMITTEDBY",
                table: "FF_FORMSUBMISSION");

            migrationBuilder.AlterColumn<string>(
                name: "SUBMITTEDBY",
                table: "FF_FORMSUBMISSION",
                type: "NVARCHAR2(2000)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "NVARCHAR2(450)",
                oldNullable: true);
        }
    }
}
