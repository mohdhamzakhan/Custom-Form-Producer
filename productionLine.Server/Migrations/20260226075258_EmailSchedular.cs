using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class EmailSchedular : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FF_EMAIL_SCHEDULE",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    TITLE = table.Column<string>(type: "NVARCHAR2(200)", maxLength: 200, nullable: false),
                    SUBJECT = table.Column<string>(type: "NVARCHAR2(500)", maxLength: 500, nullable: false),
                    BODY = table.Column<string>(type: "CLOB", nullable: false),
                    OCCURRENCE_TYPE = table.Column<string>(type: "NVARCHAR2(20)", maxLength: 20, nullable: false),
                    START_DATETIME = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    END_DATETIME = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: true),
                    CRON_EXPRESSION = table.Column<string>(type: "NVARCHAR2(100)", maxLength: 100, nullable: true),
                    RECURRENCE_DAYS = table.Column<string>(type: "NVARCHAR2(100)", maxLength: 100, nullable: true),
                    SEND_TIME = table.Column<string>(type: "NVARCHAR2(5)", maxLength: 5, nullable: true),
                    STATUS = table.Column<string>(type: "NVARCHAR2(20)", maxLength: 20, nullable: false),
                    LAST_SENT_AT = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: true),
                    NEXT_SEND_AT = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: true),
                    TOTAL_SENT_COUNT = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    CREATED_BY = table.Column<string>(type: "NVARCHAR2(100)", maxLength: 100, nullable: false),
                    CREATED_AT = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    UPDATED_AT = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    UPDATED_BY = table.Column<string>(type: "NVARCHAR2(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FF_EMAIL_SCHEDULE", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "FF_EMAIL_SCHEDULE_ATTACHMENT",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    EMAIL_SCHEDULE_ID = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    FILE_NAME = table.Column<string>(type: "NVARCHAR2(255)", maxLength: 255, nullable: false),
                    FILE_PATH = table.Column<string>(type: "NVARCHAR2(500)", maxLength: 500, nullable: false),
                    CONTENT_TYPE = table.Column<string>(type: "NVARCHAR2(100)", maxLength: 100, nullable: true),
                    FILE_SIZE_BYTES = table.Column<long>(type: "NUMBER(19)", nullable: false),
                    UPLOADED_AT = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FF_EMAIL_SCHEDULE_ATTACHMENT", x => x.ID);
                    table.ForeignKey(
                        name: "FK_FF_EMAIL_SCHEDULE_ATTACHMENT_FF_EMAIL_SCHEDULE_EMAIL_SCHEDULE_ID",
                        column: x => x.EMAIL_SCHEDULE_ID,
                        principalTable: "FF_EMAIL_SCHEDULE",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FF_EMAIL_SCHEDULE_LOG",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    EMAIL_SCHEDULE_ID = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    SENT_AT = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    STATUS = table.Column<string>(type: "NVARCHAR2(20)", maxLength: 20, nullable: false),
                    RECIPIENTS_TOTAL = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    RECIPIENTS_SUCCEEDED = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    RECIPIENTS_FAILED = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    ERROR_MESSAGE = table.Column<string>(type: "CLOB", nullable: true),
                    RECIPIENTS_JSON = table.Column<string>(type: "CLOB", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FF_EMAIL_SCHEDULE_LOG", x => x.ID);
                    table.ForeignKey(
                        name: "FK_FF_EMAIL_SCHEDULE_LOG_FF_EMAIL_SCHEDULE_EMAIL_SCHEDULE_ID",
                        column: x => x.EMAIL_SCHEDULE_ID,
                        principalTable: "FF_EMAIL_SCHEDULE",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FF_EMAIL_SCHEDULE_RECIPIENT",
                columns: table => new
                {
                    ID = table.Column<int>(type: "NUMBER(10)", nullable: false)
                        .Annotation("Oracle:Identity", "START WITH 1 INCREMENT BY 1"),
                    EMAIL_SCHEDULE_ID = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    TYPE = table.Column<string>(type: "NVARCHAR2(10)", maxLength: 10, nullable: false),
                    NAME = table.Column<string>(type: "NVARCHAR2(200)", maxLength: 200, nullable: false),
                    EMAIL = table.Column<string>(type: "NVARCHAR2(200)", maxLength: 200, nullable: true),
                    AD_OBJECT_ID = table.Column<string>(type: "NVARCHAR2(100)", maxLength: 100, nullable: true),
                    RECIPIENT_TYPE = table.Column<string>(type: "NVARCHAR2(10)", maxLength: 10, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FF_EMAIL_SCHEDULE_RECIPIENT", x => x.ID);
                    table.ForeignKey(
                        name: "FK_FF_EMAIL_SCHEDULE_RECIPIENT_FF_EMAIL_SCHEDULE_EMAIL_SCHEDULE_ID",
                        column: x => x.EMAIL_SCHEDULE_ID,
                        principalTable: "FF_EMAIL_SCHEDULE",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FF_EMAIL_SCHEDULE_CREATED_BY",
                table: "FF_EMAIL_SCHEDULE",
                column: "CREATED_BY");

            migrationBuilder.CreateIndex(
                name: "IX_FF_EMAIL_SCHEDULE_NEXT_SEND_AT",
                table: "FF_EMAIL_SCHEDULE",
                column: "NEXT_SEND_AT");

            migrationBuilder.CreateIndex(
                name: "IX_FF_EMAIL_SCHEDULE_STATUS",
                table: "FF_EMAIL_SCHEDULE",
                column: "STATUS");

            migrationBuilder.CreateIndex(
                name: "IX_FF_EMAIL_SCHEDULE_ATTACHMENT_EMAIL_SCHEDULE_ID",
                table: "FF_EMAIL_SCHEDULE_ATTACHMENT",
                column: "EMAIL_SCHEDULE_ID");

            migrationBuilder.CreateIndex(
                name: "IX_FF_EMAIL_SCHEDULE_LOG_EMAIL_SCHEDULE_ID_SENT_AT",
                table: "FF_EMAIL_SCHEDULE_LOG",
                columns: new[] { "EMAIL_SCHEDULE_ID", "SENT_AT" });

            migrationBuilder.CreateIndex(
                name: "IX_FF_EMAIL_SCHEDULE_RECIPIENT_EMAIL_SCHEDULE_ID",
                table: "FF_EMAIL_SCHEDULE_RECIPIENT",
                column: "EMAIL_SCHEDULE_ID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FF_EMAIL_SCHEDULE_ATTACHMENT");

            migrationBuilder.DropTable(
                name: "FF_EMAIL_SCHEDULE_LOG");

            migrationBuilder.DropTable(
                name: "FF_EMAIL_SCHEDULE_RECIPIENT");

            migrationBuilder.DropTable(
                name: "FF_EMAIL_SCHEDULE");
        }
    }
}
