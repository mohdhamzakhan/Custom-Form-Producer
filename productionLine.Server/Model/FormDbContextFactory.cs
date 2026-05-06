using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using productionLine.Server.Model;
using System.IO;

public class FormDbContextFactory : IDesignTimeDbContextFactory<FormDbContext>
{
    public FormDbContext CreateDbContext(string[] args)
    {
        var basePath = Directory.GetCurrentDirectory();

        var config = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile("appsettings.json") // or appsettings.config if you're custom loading
            .Build();

        var connectionString = config.GetConnectionString("SystemMonitorConnection");

        var optionsBuilder = new DbContextOptionsBuilder<FormDbContext>();
        optionsBuilder.UseOracle(connectionString);

        return new FormDbContext(optionsBuilder.Options);
    }
}