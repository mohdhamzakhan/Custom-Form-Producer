using Microsoft.EntityFrameworkCore.Metadata.Internal;
using Microsoft.EntityFrameworkCore.Migrations;
using System.Collections.Generic;
using System.Diagnostics.Metrics;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;

#nullable disable

namespace productionLine.Server.Migrations
{
    /// <inheritdoc />
    public partial class reportChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FF_REPORTFIELD_FF_REPORTTEMPLATE_ReportTemplateId",
                table: "FF_REPORTFIELD");

            migrationBuilder.DropForeignKey(
                name: "FK_FF_REPORTFILTER_FF_REPORTTEMPLATE_ReportTemplateId",
                table: "FF_REPORTFILTER");

            migrationBuilder.RenameColumn(
                name: "ReportTemplateId",
                table: "FF_REPORTFILTER",
                newName: "TEMPLATEID");

            migrationBuilder.RenameIndex(
                name: "IX_FF_REPORTFILTER_ReportTemplateId",
                table: "FF_REPORTFILTER",
                newName: "IX_FF_REPORTFILTER_TEMPLATEID");

            migrationBuilder.RenameColumn(
                name: "ReportTemplateId",
                table: "FF_REPORTFIELD",
                newName: "TEMPLATEID");

            migrationBuilder.RenameIndex(
                name: "IX_FF_REPORTFIELD_ReportTemplateId",
                table: "FF_REPORTFIELD",
                newName: "IX_FF_REPORTFIELD_TEMPLATEID");

            migrationBuilder.AlterColumn<string>(
                name: "CHARTCONFIG",
                table: "FF_REPORTTEMPLATE",
                type: "CLOB",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "NVARCHAR2(2000)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "CALCULATEDFIELDS",
                table: "FF_REPORTTEMPLATE",
                type: "CLOB",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "NVARCHAR2(2000)",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "TEMPLATEID",
                table: "FF_REPORTFILTER",
                type: "NUMBER(10)",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "NUMBER(10)",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "TEMPLATEID",
                table: "FF_REPORTFIELD",
                type: "NUMBER(10)",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "NUMBER(10)",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_FF_REPORTFIELD_FF_REPORTTEMPLATE_TEMPLATEID",
                table: "FF_REPORTFIELD",
                column: "TEMPLATEID",
                principalTable: "FF_REPORTTEMPLATE",
                principalColumn: "ID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_FF_REPORTFILTER_FF_REPORTTEMPLATE_TEMPLATEID",
                table: "FF_REPORTFILTER",
                column: "TEMPLATEID",
                principalTable: "FF_REPORTTEMPLATE",
                principalColumn: "ID",
                onDelete: ReferentialAction.Cascade);

            //ALTER TABLE FF_REPORTTEMPLATE ADD CALCULATEDFIELDS_TMP CLOB;
            //ALTER TABLE FF_REPORTTEMPLATE ADD CHARTCONFIG_TMP CLOB;

            //UPDATE FF_REPORTTEMPLATE SET CALCULATEDFIELDS_TMP = CALCULATEDFIELDS;
            //UPDATE FF_REPORTTEMPLATE SET CHARTCONFIG_TMP = CHARTCONFIG;

            //ALTER TABLE FF_REPORTTEMPLATE DROP COLUMN CALCULATEDFIELDS;
            //ALTER TABLE FF_REPORTTEMPLATE DROP COLUMN CHARTCONFIG;

            //ALTER TABLE FF_REPORTTEMPLATE RENAME COLUMN CALCULATEDFIELDS_TMP TO CALCULATEDFIELDS;
            //ALTER TABLE FF_REPORTTEMPLATE RENAME COLUMN CHARTCONFIG_TMP TO CHARTCONFIG;



        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FF_REPORTFIELD_FF_REPORTTEMPLATE_TEMPLATEID",
                table: "FF_REPORTFIELD");

            migrationBuilder.DropForeignKey(
                name: "FK_FF_REPORTFILTER_FF_REPORTTEMPLATE_TEMPLATEID",
                table: "FF_REPORTFILTER");

            migrationBuilder.RenameColumn(
                name: "TEMPLATEID",
                table: "FF_REPORTFILTER",
                newName: "ReportTemplateId");

            migrationBuilder.RenameIndex(
                name: "IX_FF_REPORTFILTER_TEMPLATEID",
                table: "FF_REPORTFILTER",
                newName: "IX_FF_REPORTFILTER_ReportTemplateId");

            migrationBuilder.RenameColumn(
                name: "TEMPLATEID",
                table: "FF_REPORTFIELD",
                newName: "ReportTemplateId");

            migrationBuilder.RenameIndex(
                name: "IX_FF_REPORTFIELD_TEMPLATEID",
                table: "FF_REPORTFIELD",
                newName: "IX_FF_REPORTFIELD_ReportTemplateId");

            migrationBuilder.AlterColumn<string>(
                name: "CHARTCONFIG",
                table: "FF_REPORTTEMPLATE",
                type: "NVARCHAR2(2000)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "CLOB",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "CALCULATEDFIELDS",
                table: "FF_REPORTTEMPLATE",
                type: "NVARCHAR2(2000)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "CLOB",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "ReportTemplateId",
                table: "FF_REPORTFILTER",
                type: "NUMBER(10)",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "NUMBER(10)");

            migrationBuilder.AlterColumn<int>(
                name: "ReportTemplateId",
                table: "FF_REPORTFIELD",
                type: "NUMBER(10)",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "NUMBER(10)");

            migrationBuilder.AddForeignKey(
                name: "FK_FF_REPORTFIELD_FF_REPORTTEMPLATE_ReportTemplateId",
                table: "FF_REPORTFIELD",
                column: "ReportTemplateId",
                principalTable: "FF_REPORTTEMPLATE",
                principalColumn: "ID");

            migrationBuilder.AddForeignKey(
                name: "FK_FF_REPORTFILTER_FF_REPORTTEMPLATE_ReportTemplateId",
                table: "FF_REPORTFILTER",
                column: "ReportTemplateId",
                principalTable: "FF_REPORTTEMPLATE",
                principalColumn: "ID");
        }
    }
}
