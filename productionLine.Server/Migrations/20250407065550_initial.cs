using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FF_FORM",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    NAME = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    FORMLINK = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FF_FORM", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "FF_FORMAPPROVER",
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
                    table.PrimaryKey("PK_FF_FORMAPPROVER", x => x.ID);
                    table.ForeignKey(
                        name: "FK_FF_FORMAPPROVER_FF_FORM_FORMID",
                        column: x => x.FORMID,
                        principalTable: "FF_FORM",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FF_FORMFIELD",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "RAW(16)", nullable: false),
                    TYPE = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    LABEL = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    REQUIRED = table.Column<bool>(type: "NUMBER(1)", nullable: false),
                    WIDTH = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    OPTIONS = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    REQUIRES_REMARKS = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true),
                    MIN = table.Column<double>(type: "BINARY_DOUBLE", nullable: true),
                    MAX = table.Column<double>(type: "BINARY_DOUBLE", nullable: true),
                    DECIMAL = table.Column<bool>(type: "NUMBER(1)", nullable: true),
                    REMARKS_OUT = table.Column<bool>(type: "NUMBER(1)", nullable: true),
                    FORMID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FF_FORMFIELD", x => x.ID);
                    table.ForeignKey(
                        name: "FK_FF_FORMFIELD_FF_FORM_FORMID",
                        column: x => x.FORMID,
                        principalTable: "FF_FORM",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FF_FORMSUBMISSION",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    FORMID = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    SUBMITTEDAT = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    SUBMITTEDBY = table.Column<string>(type: "NVARCHAR2(2000)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FF_FORMSUBMISSION", x => x.ID);
                    table.ForeignKey(
                        name: "FK_FF_FORMSUBMISSION_FF_FORM_FORMID",
                        column: x => x.FORMID,
                        principalTable: "FF_FORM",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FF_REMARK_TRIGGER",
                columns: table => new
                {
                    Id = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    OPERATOR = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    VALUE = table.Column<double>(type: "BINARY_DOUBLE", nullable: false),
                    FORMFIELDID = table.Column<Guid>(type: "RAW(16)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FF_REMARK_TRIGGER", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FF_REMARK_TRIGGER_FF_FORMFIELD_FORMFIELDID",
                        column: x => x.FORMFIELDID,
                        principalTable: "FF_FORMFIELD",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FF_FORMAPPROVAL",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    FORMSUBMISSIONID = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    APPROVERID = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    APPROVERNAME = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    APPROVALLEVEL = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    APPROVALAT = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    COMMENTS = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    STATUS = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FF_FORMAPPROVAL", x => x.ID);
                    table.ForeignKey(
                        name: "FK_FF_FORMAPPROVAL_FF_FORMSUBMISSION_FORMSUBMISSIONID",
                        column: x => x.FORMSUBMISSIONID,
                        principalTable: "FF_FORMSUBMISSION",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FF_FORMSUBMISSIONDATA",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    FIELDLABEL = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    FIELDVALUE = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    FORMSUBMISSIONID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FF_FORMSUBMISSIONDATA", x => x.ID);
                    table.ForeignKey(
                        name: "FK_FF_FORMSUBMISSIONDATA_FF_FORMSUBMISSION_FORMSUBMISSIONID",
                        column: x => x.FORMSUBMISSIONID,
                        principalTable: "FF_FORMSUBMISSION",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FF_FORMAPPROVAL_FORMSUBMISSIONID",
                table: "FF_FORMAPPROVAL",
                column: "FORMSUBMISSIONID");

            migrationBuilder.CreateIndex(
                name: "IX_FF_FORMAPPROVER_FORMID",
                table: "FF_FORMAPPROVER",
                column: "FORMID");

            migrationBuilder.CreateIndex(
                name: "IX_FF_FORMFIELD_FORMID",
                table: "FF_FORMFIELD",
                column: "FORMID");

            migrationBuilder.CreateIndex(
                name: "IX_FF_FORMSUBMISSION_FORMID",
                table: "FF_FORMSUBMISSION",
                column: "FORMID");

            migrationBuilder.CreateIndex(
                name: "IX_FF_FORMSUBMISSIONDATA_FORMSUBMISSIONID",
                table: "FF_FORMSUBMISSIONDATA",
                column: "FORMSUBMISSIONID");

            migrationBuilder.CreateIndex(
                name: "IX_FF_REMARK_TRIGGER_FORMFIELDID",
                table: "FF_REMARK_TRIGGER",
                column: "FORMFIELDID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FF_FORMAPPROVAL");

            migrationBuilder.DropTable(
                name: "FF_FORMAPPROVER");

            migrationBuilder.DropTable(
                name: "FF_FORMSUBMISSIONDATA");

            migrationBuilder.DropTable(
                name: "FF_REMARK_TRIGGER");

            migrationBuilder.DropTable(
                name: "FF_FORMSUBMISSION");

            migrationBuilder.DropTable(
                name: "FF_FORMFIELD");

            migrationBuilder.DropTable(
                name: "FF_FORM");
        }
    }
}
