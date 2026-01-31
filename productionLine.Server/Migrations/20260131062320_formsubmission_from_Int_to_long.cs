using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class formsubmission_from_Int_to_long : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<long>(
                name: "FORMSUBMISSIONID",
                table: "FF_FORMSUBMISSIONDATA",
                type: "NUMBER(19)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "NUMBER(10)");

            migrationBuilder.AlterColumn<long>(
                name: "ID",
                table: "FF_FORMSUBMISSIONDATA",
                type: "NUMBER(19)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "NUMBER(10)")
                .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1")
                .OldAnnotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1");

            migrationBuilder.AlterColumn<long>(
                name: "ID",
                table: "FF_FORMSUBMISSION",
                type: "NUMBER(19)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "NUMBER(10)")
                .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1")
                .OldAnnotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1");

            migrationBuilder.AlterColumn<long>(
                name: "FORMSUBMISSIONID",
                table: "FF_FORMAPPROVAL",
                type: "NUMBER(19)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "NUMBER(10)");

            migrationBuilder.AlterColumn<long>(
                name: "ID",
                table: "FF_FORMAPPROVAL",
                type: "NUMBER(19)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "NUMBER(10)")
                .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1")
                .OldAnnotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "FORMSUBMISSIONID",
                table: "FF_FORMSUBMISSIONDATA",
                type: "NUMBER(10)",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "NUMBER(19)");

            migrationBuilder.AlterColumn<int>(
                name: "ID",
                table: "FF_FORMSUBMISSIONDATA",
                type: "NUMBER(10)",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "NUMBER(19)")
                .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1")
                .OldAnnotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1");

            migrationBuilder.AlterColumn<int>(
                name: "ID",
                table: "FF_FORMSUBMISSION",
                type: "NUMBER(10)",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "NUMBER(19)")
                .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1")
                .OldAnnotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1");

            migrationBuilder.AlterColumn<int>(
                name: "FORMSUBMISSIONID",
                table: "FF_FORMAPPROVAL",
                type: "NUMBER(10)",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "NUMBER(19)");

            migrationBuilder.AlterColumn<int>(
                name: "ID",
                table: "FF_FORMAPPROVAL",
                type: "NUMBER(10)",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "NUMBER(19)")
                .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1")
                .OldAnnotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1");
        }
    }
}
