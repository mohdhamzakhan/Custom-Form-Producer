using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace productionLine.Server.Model
{
    public class FormDbContext : DbContext
    {
        public FormDbContext(DbContextOptions<FormDbContext> options) : base(options) { }
        public DbSet<Form> Forms { get; set; }
        public DbSet<FormField> FormFields { get; set; }
        public DbSet<FormSubmission> FormSubmissions { get; set; }
        public DbSet<FormSubmissionData> FormSubmissionData { get; set; }
        public DbSet<FormApprover> FormApprovers { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
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
