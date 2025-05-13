using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace productionLine.Server.Model
{
    public class FormDbContext : DbContext
    {
        public FormDbContext(DbContextOptions<FormDbContext> options) : base(options) {
            ChangeTracker.LazyLoadingEnabled = false;
        }
        public DbSet<Form> Forms { get; set; }
        public DbSet<FormField> FormFields { get; set; }
        public DbSet<FormSubmission> FormSubmissions { get; set; }
        public DbSet<FormSubmissionData> FormSubmissionData { get; set; }
        public DbSet<FormApprover> FormApprovers { get; set; }
        public DbSet<FormApproval> FormApprovals { get; set; }
        public DbSet<Report> Reports { get; set; }
        public DbSet<ReportAccess> ReportAccesses { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 🔥 Tell EF Core: GridColumn is NOT a table
            modelBuilder.Entity<GridColumn>().HasNoKey();  // ➡️ No Primary Key
            modelBuilder.Entity<GridColumn>().ToTable((string)null); // ➡️ Don't map to any table

            // 🔥 Also add this for FormField.ColumnsJson
            modelBuilder.Entity<FormField>()
                .Property(f => f.ColumnsJson)
                .HasColumnType("CLOB");  // Oracle will store JSON inside a CLOB field

            modelBuilder.Entity<FormField>()
              .Property(f => f.Columns)
              .HasColumnType("CLOB");  // Oracle will store JSON inside a CLOB field

            // ✅ Create options outside
            var jsonOptions = new JsonSerializerOptions
            {
                WriteIndented = false
            };

            // ✅ Fixed version without optional arguments
            modelBuilder.Entity<FormField>()
                .Property(f => f.Columns)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, jsonOptions),    // Serialize manually with options
                    v => JsonSerializer.Deserialize<List<GridColumn>>(v, jsonOptions) // Deserialize manually with options
                );

            modelBuilder.Entity<Form>()
                .HasMany(f => f.Fields)
                .WithOne(f => f.Form)
                .HasForeignKey(f => f.FormId);

            modelBuilder.Entity<FormSubmission>()
                .HasMany(f => f.SubmissionData)
                .WithOne(d => d.FormSubmission)
                .HasForeignKey(d => d.FormSubmissionId);

            // Configure the relationship between FormField and RemarkTrigger
            modelBuilder.Entity<FormField>()
                .HasMany(f => f.RemarkTriggers)
                .WithOne(t => t.FormField)
                .HasForeignKey(t => t.FormFieldId);

            modelBuilder.Entity<FormApprover>()
        .HasOne(fa => fa.Form)
        .WithMany(f => f.Approvers)
        .HasForeignKey(fa => fa.FormId);

            modelBuilder.Entity<Report>()
           .HasOne(r => r.Form)
           .WithMany()
           .HasForeignKey(r => r.FormId);

            modelBuilder.Entity<Form>()
    .Property(f => f.RowVersion)
    .IsRowVersion();


            modelBuilder.Entity<ReportAccess>()
                .HasOne(ra => ra.Report)
                .WithMany(r => r.AccessList)
                .HasForeignKey(ra => ra.ReportId);

            // Configure JSON serialization for lists (if you're using JSON storage)
            modelBuilder.Entity<FormField>()
                .Property(f => f.Options)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions)null));

            modelBuilder.Entity<FormField>()
                .Property(f => f.RequiresRemarks)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions)null));
        }
    }

}
