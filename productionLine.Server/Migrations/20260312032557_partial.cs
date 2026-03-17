using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class partial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FF_PARTIALSUBMISSION",
                columns: table => new
                {
                    ID = table.Column<long>(type: "NUMBER(19)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    FORMID = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    TOKEN = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    ASSIGNEDTOEMAIL = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    ASSIGNEDTONAME = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    FILLEDBY = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    CREATEDAT = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    COMPLETEDAT = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: true),
                    STATUS = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    FILLEDDATA = table.Column<string>(type: "CLOB", nullable: true),
                    FILLEDFIELDS = table.Column<string>(type: "CLOB", nullable: true),
                    SUBMISSIONID = table.Column<long>(type: "NUMBER(19)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FF_PARTIALSUBMISSION", x => x.ID);
                    table.ForeignKey(
                        name: "FK_FF_PARTIALSUBMISSION_FF_FORM_FORMID",
                        column: x => x.FORMID,
                        principalTable: "FF_FORM",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FF_PARTIALSUBMISSION_FORMID",
                table: "FF_PARTIALSUBMISSION",
                column: "FORMID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FF_PARTIALSUBMISSION");
        }
    }
}
