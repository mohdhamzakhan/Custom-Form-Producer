using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace productionLine.Server.Model
{
    // --- BASE CONTEXT ---
    public class FormDbContext : DbContext
    {
        // ✅ Notice it is DbContextOptions (NOT DbContextOptions<FormDbContext>)
        public FormDbContext(DbContextOptions options) : base(options)
        {
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
        public DbSet<ReportTemplate> ReportTemplates { get; set; }
        public DbSet<ReportField> ReportFields { get; set; }
        public DbSet<ReportFilter> ReportFilters { get; set; }
        public DbSet<EmailSchedule> EmailSchedules { get; set; }
        public DbSet<EmailScheduleRecipient> EmailScheduleRecipients { get; set; }
        public DbSet<EmailScheduleAttachment> EmailScheduleAttachments { get; set; }
        public DbSet<EmailScheduleLog> EmailScheduleLogs { get; set; }
        public DbSet<AuditPlan> AuditPlans { get; set; }
        public DbSet<AuditPlanEntry> AuditPlanEntries { get; set; }
        public DbSet<PartialSubmission> PartialSubmissions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 🔥 Tell EF Core: GridColumn is NOT a table
            modelBuilder.Entity<GridColumn>().HasNoKey();
            modelBuilder.Entity<GridColumn>().ToTable((string)null);

            // 🔥 Also add this for FormField.ColumnsJson
            modelBuilder.Entity<FormField>()
                .Property(f => f.ColumnsJson)
                .HasColumnType("CLOB");

            modelBuilder.Entity<FormField>()
              .Property(f => f.Columns)
              .HasColumnType("CLOB");

            modelBuilder.Entity<ReportTemplate>(entity =>
            {
                entity.Property(e => e.CalculatedFields).HasColumnType("CLOB");
                entity.Property(e => e.ChartConfig).HasColumnType("CLOB");

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
                entity.Property(e => e.IncludeApprovals).HasConversion<int>();
                entity.Property(e => e.IncludeRemarks).HasConversion<int>();
                entity.Property(e => e.IsDeleted).HasConversion<int>();
                entity.Property(e => e.IsMultiForm).HasDefaultValue(0);
            });

            modelBuilder.Entity<ReportField>(entity => { entity.HasKey(e => e.Id); });
            modelBuilder.Entity<ReportFilter>(entity => { entity.HasKey(e => e.Id); });

            var jsonOptions = new JsonSerializerOptions { WriteIndented = false };

            modelBuilder.Entity<FormField>()
                .Property(f => f.Columns)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, jsonOptions),
                    v => JsonSerializer.Deserialize<List<GridColumn>>(v, jsonOptions)
                );

            modelBuilder.Entity<Form>()
                .HasMany(f => f.Fields)
                .WithOne(f => f.Form)
                .HasForeignKey(f => f.FormId);

            modelBuilder.Entity<FormSubmission>()
                .HasMany(f => f.SubmissionData)
                .WithOne(d => d.FormSubmission)
                .HasForeignKey(d => d.FormSubmissionId);

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

            modelBuilder.Entity<FormSubmissionData>()
                .HasIndex(d => new { d.FieldLabel, d.FormSubmissionId })
                .HasDatabaseName("IX_SUBMDATA_FIELDLABEL_SUBID");

            modelBuilder.Entity<FormSubmission>()
                .HasIndex(s => new { s.FormId, s.SubmittedAt })
                .HasDatabaseName("IX_FORMSUBMISSIONS_FORMID_DATE");

            modelBuilder.Entity<FormSubmission>()
                .HasIndex(s => new { s.FormId, s.SubmittedAt, s.Id })
                .HasDatabaseName("IX_FORMSUBMISSIONS_FORMID_DATE_ID");

            modelBuilder.Entity<Form>()
                .Property(e => e.AllowPartialFill)
                .HasConversion<int>();

            modelBuilder.Entity<EmailSchedule>(entity =>
            {
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.NextSendAt);
                entity.HasIndex(e => e.CreatedBy);

                entity.HasMany(e => e.Recipients)
                      .WithOne(r => r.EmailSchedule)
                      .HasForeignKey(r => r.EmailScheduleId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.Attachments)
                      .WithOne(a => a.EmailSchedule)
                      .HasForeignKey(a => a.EmailScheduleId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.Logs)
                      .WithOne(l => l.EmailSchedule)
                      .HasForeignKey(l => l.EmailScheduleId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<EmailScheduleLog>(entity =>
            {
                entity.HasIndex(l => new { l.EmailScheduleId, l.SentAt });
            });

            modelBuilder.Entity<EmailScheduleRecipient>(entity =>
            {
                entity.HasIndex(r => r.EmailScheduleId);
            });

            modelBuilder.Entity<AuditPlan>(e => {
                e.HasKey(p => p.Id);
                e.Property(p => p.PlanName).IsRequired().HasMaxLength(200);
                e.Property(p => p.Status).HasMaxLength(20);
                e.HasMany(p => p.Entries)
                 .WithOne(en => en.AuditPlan)
                 .HasForeignKey(en => en.AuditPlanId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<AuditPlanEntry>(e => {
                e.HasKey(en => en.Id);
                e.Property(en => en.Title).IsRequired().HasMaxLength(300);
                e.Property(en => en.Status).HasMaxLength(20);
            });
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            optionsBuilder.EnableSensitiveDataLogging()
                          .LogTo(Console.WriteLine, LogLevel.Information);
        }

    } // <--- ✅ FormDbContext PROPERLY CLOSES HERE


    // ====================================================================
    // ✅ DERIVED CONTEXTS OUTSIDE FormDbContext
    // ====================================================================

    public class PrimaryDbContext : FormDbContext
    {
        public PrimaryDbContext(DbContextOptions<PrimaryDbContext> options) : base(options)
        {
        }
    }

    public class SecondaryDbContext : FormDbContext
    {
        public SecondaryDbContext(DbContextOptions<SecondaryDbContext> options) : base(options)
        {
        }
    }
}