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
        public DbSet<FormAccess> FormAccess { get; set; }

        public DbSet<FormSignature> FormSignatures { get; set; }
        public DbSet<FormToAdd> FormToAdd { get; set; }
        public DbSet<FormApproval> FormApprovals { get; set; }
        public DbSet<Report> Reports { get; set; }
        public DbSet<ReportAccess> ReportAccesses { get; set; }

        public DbSet<ReportTemplate> ReportTemplates { get; set; } // Add this line to include ReportTemplate in the context
        public DbSet<ReportField> ReportFields { get; set; } // Add this line to include ReportField in the context
        public DbSet<ReportFilter> ReportFilters { get; set; } // Add this line to include ReportFilter in the context
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

            modelBuilder.Entity<ReportTemplate>(entity =>
            {
                // JSON fields must map to CLOB
                entity.Property(e => e.CalculatedFields)
                      .HasColumnType("CLOB");

                entity.Property(e => e.ChartConfig)
                      .HasColumnType("CLOB");

                // Relationships
                entity.HasMany(e => e.Fields)
                      .WithOne(f => f.ReportTemplate)
                      .HasForeignKey(f => f.ReportTemplateId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.Filters)
                      .WithOne(f => f.ReportTemplate)
                      .HasForeignKey(f => f.ReportTemplateId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<ReportTemplate>(entity =>
            {
                // Configure boolean to number conversion for Oracle
                entity.Property(e => e.IncludeApprovals)
                    .HasConversion<int>();

                entity.Property(e => e.IncludeRemarks)
                    .HasConversion<int>();

                entity.Property(e => e.IsDeleted)
                    .HasConversion<int>();
            });

            // ReportField
            modelBuilder.Entity<ReportField>(entity =>
            {
                entity.HasKey(e => e.Id);
            });

            // ReportFilter
            modelBuilder.Entity<ReportFilter>(entity =>
            {
                entity.HasKey(e => e.Id);
            });

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

            modelBuilder.Entity<ReportTemplate>()
    .Property(e => e.IncludeApprovals)
    .HasConversion<int>();

            modelBuilder.Entity<ReportTemplate>()
                .Property(e => e.IncludeRemarks)
                .HasConversion<int>();

            modelBuilder.Entity<ReportTemplate>()
                .Property(e => e.IsMultiForm)
                .HasDefaultValue(0);
        }

        // Add this temporarily to see what SQL is being generated
        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            optionsBuilder.EnableSensitiveDataLogging()
                          .LogTo(Console.WriteLine, LogLevel.Information);
        }
    }

}
