using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace productionLine.Server.Migrations
{
    public partial class fieldValueIncrease : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Add temporary CLOB column
            migrationBuilder.Sql(
                @"ALTER TABLE FF_FORMSUBMISSIONDATA 
                  ADD FIELDVALUE_TMP CLOB");

            // 2. Copy existing data
            migrationBuilder.Sql(
                @"UPDATE FF_FORMSUBMISSIONDATA 
                  SET FIELDVALUE_TMP = FIELDVALUE");

            // 3. Drop old column
            migrationBuilder.Sql(
                @"ALTER TABLE FF_FORMSUBMISSIONDATA 
                  DROP COLUMN FIELDVALUE");

            // 4. Rename new column to original name
            migrationBuilder.Sql(
                @"ALTER TABLE FF_FORMSUBMISSIONDATA 
                  RENAME COLUMN FIELDVALUE_TMP TO FIELDVALUE");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Rollback logic (reverse)

            // 1. Add old NVARCHAR2 column
            migrationBuilder.Sql(
                @"ALTER TABLE FF_FORMSUBMISSIONDATA 
                  ADD FIELDVALUE_OLD NVARCHAR2(2000)");

            // 2. Copy back (truncated if >2000)
            migrationBuilder.Sql(
                @"UPDATE FF_FORMSUBMISSIONDATA 
                  SET FIELDVALUE_OLD = SUBSTR(FIELDVALUE, 1, 2000)");

            // 3. Drop CLOB column
            migrationBuilder.Sql(
                @"ALTER TABLE FF_FORMSUBMISSIONDATA 
                  DROP COLUMN FIELDVALUE");

            // 4. Rename back
            migrationBuilder.Sql(
                @"ALTER TABLE FF_FORMSUBMISSIONDATA 
                  RENAME COLUMN FIELDVALUE_OLD TO FIELDVALUE");
        }
    }
}
