using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class productionConfig : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FF_LINE_CONFIG",
                columns: table => new
                {
                    ID = table.Column<string>(type: "VARCHAR2(36)", nullable: false),
                    PLANT = table.Column<string>(type: "VARCHAR2(200)", maxLength: 200, nullable: false),
                    FORMID = table.Column<string>(type: "VARCHAR2(100)", maxLength: 100, nullable: false),
                    SHIFT_TEMPLATE_ID = table.Column<string>(type: "VARCHAR2(100)", maxLength: 100, nullable: true),
                    ENGINEERS = table.Column<string>(type: "CLOB", nullable: true),
                    SUPERVISORS = table.Column<string>(type: "CLOB", nullable: true),
                    CREATED_AT = table.Column<DateTime>(type: "TIMESTAMP", nullable: false),
                    UPDATED_AT = table.Column<DateTime>(type: "TIMESTAMP", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FF_LINE_CONFIG", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "FF_NOTIFICATION_LOG",
                columns: table => new
                {
                    ID = table.Column<string>(type: "NVARCHAR2(450)", nullable: false),
                    LINE_ID = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    LINE_PLANT = table.Column<string>(type: "NVARCHAR2(200)", maxLength: 200, nullable: false),
                    RECIPIENT_ID = table.Column<string>(type: "NVARCHAR2(2000)", nullable: false),
                    RECIPIENT_NAME = table.Column<string>(type: "NVARCHAR2(200)", maxLength: 200, nullable: false),
                    PLATFORM = table.Column<string>(type: "NVARCHAR2(10)", maxLength: 10, nullable: false),
                    STATUS = table.Column<string>(type: "NVARCHAR2(20)", maxLength: 20, nullable: false),
                    SUPPRESS_REASON = table.Column<string>(type: "NVARCHAR2(100)", maxLength: 100, nullable: true),
                    SENT_AT = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    ERROR_MSG = table.Column<string>(type: "NVARCHAR2(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FF_NOTIFICATION_LOG", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "FF_QUIET_HOURS",
                columns: table => new
                {
                    ID = table.Column<string>(type: "NVARCHAR2(450)", nullable: false),
                    ENABLED = table.Column<bool>(type: "NUMBER(1)", nullable: false),
                    START_TIME = table.Column<string>(type: "NVARCHAR2(5)", maxLength: 5, nullable: true),
                    END_TIME = table.Column<string>(type: "NVARCHAR2(5)", maxLength: 5, nullable: true),
                    SKIP_BREAKS = table.Column<bool>(type: "NUMBER(1)", nullable: false),
                    UPDATED_AT = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FF_QUIET_HOURS", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "FF_RECIPIENT_CONFIG",
                columns: table => new
                {
                    ID = table.Column<string>(type: "NVARCHAR2(450)", nullable: false),
                    NAME = table.Column<string>(type: "NVARCHAR2(200)", maxLength: 200, nullable: false),
                    EMAIL = table.Column<string>(type: "NVARCHAR2(200)", maxLength: 200, nullable: true),
                    PHONE = table.Column<string>(type: "NVARCHAR2(50)", maxLength: 50, nullable: true),
                    ENABLED = table.Column<bool>(type: "NUMBER(1)", nullable: false),
                    DELAY_MIN = table.Column<int>(type: "NUMBER(10)", nullable: false),
                    ANDROID = table.Column<bool>(type: "NUMBER(1)", nullable: false),
                    IOS = table.Column<bool>(type: "NUMBER(1)", nullable: false),
                    DEVICE_TOKENS = table.Column<string>(type: "CLOB", nullable: true),
                    LINE_IDS = table.Column<string>(type: "CLOB", nullable: true),
                    CREATED_AT = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false),
                    UPDATED_AT = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FF_RECIPIENT_CONFIG", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "FF_SHIFT_CONFIG",
                columns: table => new
                {
                    ID = table.Column<string>(type: "NVARCHAR2(450)", nullable: false),
                    SHIFT_KEY = table.Column<string>(type: "NVARCHAR2(10)", maxLength: 10, nullable: false),
                    NAME = table.Column<string>(type: "NVARCHAR2(50)", maxLength: 50, nullable: false),
                    START_TIME = table.Column<string>(type: "NVARCHAR2(5)", maxLength: 5, nullable: false),
                    END_TIME = table.Column<string>(type: "NVARCHAR2(5)", maxLength: 5, nullable: false),
                    BREAKS = table.Column<string>(type: "CLOB", nullable: true),
                    UPDATED_AT = table.Column<DateTime>(type: "TIMESTAMP(7)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FF_SHIFT_CONFIG", x => x.ID);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FF_LINE_CONFIG");

            migrationBuilder.DropTable(
                name: "FF_NOTIFICATION_LOG");

            migrationBuilder.DropTable(
                name: "FF_QUIET_HOURS");

            migrationBuilder.DropTable(
                name: "FF_RECIPIENT_CONFIG");

            migrationBuilder.DropTable(
                name: "FF_SHIFT_CONFIG");
        }
    }
}
