using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class allowedUserstable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {

            migrationBuilder.CreateTable(
                name: "FF_FORMACCESS",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    ADOBJECTID = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    NAME = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    EMAIL = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    TYPE = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    LEVEL = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    FORMID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FF_FORMACCESS", x => x.ID);
                    table.ForeignKey(
                        name: "FK_FF_FORMACCESS_FF_FORM_FORMID",
                        column: x => x.FORMID,
                        principalTable: "FF_FORM",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FF_FORMACCESS_FORMID",
                table: "FF_FORMACCESS",
                column: "FORMID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FF_FORMACCESS");

            migrationBuilder.AddColumn<int>(
                name: "FormId1",
                table: "FF_FORMAPPROVER",
                type: "NUMBER(10)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_FF_FORMAPPROVER_FormId1",
                table: "FF_FORMAPPROVER",
                column: "FormId1");

            migrationBuilder.AddForeignKey(
                name: "FK_FF_FORMAPPROVER_FF_FORM_FormId1",
                table: "FF_FORMAPPROVER",
                column: "FormId1",
                principalTable: "FF_FORM",
                principalColumn: "ID");
        }
    }
}
