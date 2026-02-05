using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class Signature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FF_FORMSIGNATURE",
                columns: table => new
                {
                    ID = table.Column<long>(type: "NUMBER(19)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    FORMSUBMISSIONID = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    FIELDLABEL = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    SIGNATUREDATA = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    SIGNEDAT = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    FormSubmissionId1 = table.Column<long>(type: "NUMBER(19)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FF_FORMSIGNATURE", x => x.ID);
                    table.ForeignKey(
                        name: "FK_FF_FORMSIGNATURE_FF_FORMSUBMISSION_FormSubmissionId1",
                        column: x => x.FormSubmissionId1,
                        principalTable: "FF_FORMSUBMISSION",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FF_FORMSIGNATURE_FormSubmissionId1",
                table: "FF_FORMSIGNATURE",
                column: "FormSubmissionId1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FF_FORMSIGNATURE");
        }
    }
}
