using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Microsoft.Extensions.Logging;
using System.Text.Json;

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

        public DbSet<LineConfig> LineConfigs { get; set; }
        public DbSet<RecipientConfig> RecipientConfigs { get; set; }
        public DbSet<QuietHoursConfig> QuietHoursConfigs { get; set; }
        public DbSet<ShiftConfig> ShiftConfigs { get; set; }
        public DbSet<NotificationLog> NotificationLogs { get; set; }

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

            modelBuilder.Entity<LineConfig>(e =>
            {
                e.ToTable("FF_LINE_CONFIG");
                e.HasKey(x => x.Id);

                e.Property(x => x.Id)
                    .HasColumnName("ID")
                    .HasConversion(
                        v => v.ToString(),
                        v => Guid.Parse(v));

                e.Property(x => x.Plant).HasColumnName("PLANT").HasMaxLength(200).IsRequired();
                e.Property(x => x.FormId).HasColumnName("FORMID").HasMaxLength(100).IsRequired();
                e.Property(x => x.ShiftTemplateId).HasColumnName("SHIFT_TEMPLATE_ID").HasMaxLength(100);
                e.Property(x => x.EngineersJson).HasColumnName("ENGINEERS").HasColumnType("CLOB");
                e.Property(x => x.SupervisorsJson).HasColumnName("SUPERVISORS").HasColumnType("CLOB");
                e.Property(x => x.CreatedAt).HasColumnName("CREATED_AT");
                e.Property(x => x.UpdatedAt).HasColumnName("UPDATED_AT");

                // Ignore computed properties — they are backed by the *Json columns
                e.Ignore(x => x.Engineers);
                e.Ignore(x => x.Supervisors);
            });

            // ── Reusable converter ────────────────────────────────────────────
            // GuidToStringConverter is the correct way to handle Guid PKs with
            // Oracle EF provider.  Using raw lambda HasConversion(v => v.ToString(),
            // v => Guid.Parse(v)) causes the provider to infer the store type as
            // long? which produces "Cannot implicitly convert type 'string' to 'long?'".
            // Pairing the converter with an explicit HasColumnType("VARCHAR2(36)")
            // tells Oracle exactly what column type to create/read.
            var guidConverter = new GuidToStringConverter();

            // ── LineConfig ────────────────────────────────────────────────────
            modelBuilder.Entity<LineConfig>(e =>
            {
                e.ToTable("FF_LINE_CONFIG");
                e.HasKey(x => x.Id);

                e.Property(x => x.Id)
                    .HasColumnName("ID")
                    .HasColumnType("VARCHAR2(36)")
                    .HasConversion(guidConverter);

                e.Property(x => x.Plant)
                    .HasColumnName("PLANT")
                    .HasColumnType("VARCHAR2(200)")
                    .IsRequired();

                e.Property(x => x.FormId)
                    .HasColumnName("FORMID")
                    .HasColumnType("VARCHAR2(100)")
                    .IsRequired();

                e.Property(x => x.ShiftTemplateId)
                    .HasColumnName("SHIFT_TEMPLATE_ID")
                    .HasColumnType("VARCHAR2(100)");

                e.Property(x => x.EngineersJson)
                    .HasColumnName("ENGINEERS")
                    .HasColumnType("CLOB");

                e.Property(x => x.SupervisorsJson)
                    .HasColumnName("SUPERVISORS")
                    .HasColumnType("CLOB");

                e.Property(x => x.CreatedAt)
                    .HasColumnName("CREATED_AT")
                    .HasColumnType("TIMESTAMP");

                e.Property(x => x.UpdatedAt)
                    .HasColumnName("UPDATED_AT")
                    .HasColumnType("TIMESTAMP");

                // NotMapped computed properties backed by *Json columns
                e.Ignore(x => x.Engineers);
                e.Ignore(x => x.Supervisors);
            });

            // ── RecipientConfig ─────────────────────────────────────────────
            modelBuilder.Entity<RecipientConfig>(e =>
            {
                e.ToTable("FF_RECIPIENT_CONFIG");
                e.HasKey(x => x.Id);

                e.Property(x => x.Id)
                    .HasColumnName("ID")
                    .HasConversion(
                        v => v.ToString(),
                        v => Guid.Parse(v));

                e.Property(x => x.Name).HasColumnName("NAME").HasMaxLength(200).IsRequired();
                e.Property(x => x.Email).HasColumnName("EMAIL").HasMaxLength(200);
                e.Property(x => x.Phone).HasColumnName("PHONE").HasMaxLength(50);
                e.Property(x => x.Enabled).HasColumnName("ENABLED").HasColumnType("NUMBER(1)");
                e.Property(x => x.DelayMin).HasColumnName("DELAY_MIN");
                e.Property(x => x.Android).HasColumnName("ANDROID").HasColumnType("NUMBER(1)");
                e.Property(x => x.Ios).HasColumnName("IOS").HasColumnType("NUMBER(1)");
                e.Property(x => x.DeviceTokensJson).HasColumnName("DEVICE_TOKENS").HasColumnType("CLOB");
                e.Property(x => x.LineIdsJson).HasColumnName("LINE_IDS").HasColumnType("CLOB");
                e.Property(x => x.CreatedAt).HasColumnName("CREATED_AT");
                e.Property(x => x.UpdatedAt).HasColumnName("UPDATED_AT");

                e.Ignore(x => x.DeviceTokens);
                e.Ignore(x => x.LineIds);
            });

            // ── QuietHoursConfig ────────────────────────────────────────────
            modelBuilder.Entity<QuietHoursConfig>(e =>
            {
                e.ToTable("FF_QUIET_HOURS");
                e.HasKey(x => x.Id);

                e.Property(x => x.Id)
                    .HasColumnName("ID")
                    .HasConversion(
                        v => v.ToString(),
                        v => Guid.Parse(v));

                e.Property(x => x.Enabled).HasColumnName("ENABLED").HasColumnType("NUMBER(1)");
                e.Property(x => x.Start).HasColumnName("START_TIME").HasMaxLength(5);
                e.Property(x => x.End).HasColumnName("END_TIME").HasMaxLength(5);
                e.Property(x => x.SkipBreaks).HasColumnName("SKIP_BREAKS").HasColumnType("NUMBER(1)");
                e.Property(x => x.UpdatedAt).HasColumnName("UPDATED_AT");
            });

            // ── ShiftConfig ─────────────────────────────────────────────────
            modelBuilder.Entity<ShiftConfig>(e =>
            {
                e.ToTable("FF_SHIFT_CONFIG");
                e.HasKey(x => x.Id);

                e.Property(x => x.Id)
                    .HasColumnName("ID")
                    .HasConversion(
                        v => v.ToString(),
                        v => Guid.Parse(v));

                e.Property(x => x.Key).HasColumnName("SHIFT_KEY").HasMaxLength(10).IsRequired();
                e.Property(x => x.Name).HasColumnName("NAME").HasMaxLength(50).IsRequired();
                e.Property(x => x.Start).HasColumnName("START_TIME").HasMaxLength(5);
                e.Property(x => x.End).HasColumnName("END_TIME").HasMaxLength(5);
                e.Property(x => x.BreaksJson).HasColumnName("BREAKS").HasColumnType("CLOB");
                e.Property(x => x.UpdatedAt).HasColumnName("UPDATED_AT");

                e.Ignore(x => x.Breaks);
            });

            // ── NotificationLog ─────────────────────────────────────────────
            modelBuilder.Entity<NotificationLog>(e =>
            {
                e.ToTable("FF_NOTIFICATION_LOG");
                e.HasKey(x => x.Id);

                e.Property(x => x.Id)
                    .HasColumnName("ID")
                    .HasConversion(
                        v => v.ToString(),
                        v => Guid.Parse(v));

                e.Property(x => x.LineId).HasColumnName("LINE_ID");
                e.Property(x => x.LinePlant).HasColumnName("LINE_PLANT").HasMaxLength(200);
                e.Property(x => x.RecipientId).HasColumnName("RECIPIENT_ID")
                    .HasConversion(v => v.ToString(), v => Guid.Parse(v));
                e.Property(x => x.RecipientName).HasColumnName("RECIPIENT_NAME").HasMaxLength(200);
                e.Property(x => x.Platform).HasColumnName("PLATFORM").HasMaxLength(10);
                e.Property(x => x.Status).HasColumnName("STATUS").HasMaxLength(20);
                e.Property(x => x.SuppressReason).HasColumnName("SUPPRESS_REASON").HasMaxLength(100);
                e.Property(x => x.SentAt).HasColumnName("SENT_AT");
                e.Property(x => x.ErrorMsg).HasColumnName("ERROR_MSG").HasMaxLength(500);
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