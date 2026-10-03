using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class peopleTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FF_AUDITPLANENTRYPERSON",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    AUDITPLANENTRYID = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    ROLE = table.Column<string>(type: "NVARCHAR2(10)", maxLength: 10, nullable: false),
                    PERSONID = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    PERSONTYPE = table.Column<string>(type: "NVARCHAR2(10)", maxLength: 10, nullable: false),
                    PERSONNAME = table.Column<string>(type: "NVARCHAR2(300)", maxLength: 300, nullable: false),
                    PERSONEMAIL = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FF_AUDITPLANENTRYPERSON", x => x.ID);
                    table.ForeignKey(
                        name: "FK_FF_AUDITPLANENTRYPERSON_FF_AUDITPLANENTRY_AUDITPLANENTRYID",
                        column: x => x.AUDITPLANENTRYID,
                        principalTable: "FF_AUDITPLANENTRY",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FF_AUDITPLANENTRYPERSON_AUDITPLANENTRYID",
                table: "FF_AUDITPLANENTRYPERSON",
                column: "AUDITPLANENTRYID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FF_AUDITPLANENTRYPERSON");
        }
    }
}
