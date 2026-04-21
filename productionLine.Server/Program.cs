using Hangfire;
using Hangfire.Oracle;
using Hangfire.Oracle.Core;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using productionLine.Server.Model;
using productionLine.Server.Service;
using System.Data;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// ============================================================
// ✅ UPDATED DATABASE CONFIGURATION
// ============================================================

// 1. Register Primary Database
builder.Services.AddDbContext<PrimaryDbContext>(options =>
    options.UseOracle(builder.Configuration.GetConnectionString("SystemMonitorConnection")));

// 2. Register Secondary Database
builder.Services.AddDbContext<SecondaryDbContext>(options =>
    options.UseOracle(builder.Configuration.GetConnectionString("SecondaryConnection")));

// 3. Fallback Mapping: Any controller asking for 'FormDbContext' gets the 'PrimaryDbContext'
builder.Services.AddScoped<FormDbContext>(provider => provider.GetRequiredService<PrimaryDbContext>());

// ============================================================

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

// Configure Swagger
builder.Services.AddSwaggerGen();

// Configure controllers and JSON
builder.Services.AddControllers()
    .AddNewtonsoftJson(options =>
    {
        options.SerializerSettings.ReferenceLoopHandling = Newtonsoft.Json.ReferenceLoopHandling.Ignore;
    })
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

// Register Memory Cache
builder.Services.AddMemoryCache();

builder.Services.Configure<JsonOptions>(options =>
{
    options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
});
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.SuppressModelStateInvalidFilter = false;
});

// Configure Form Options
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 104857600; // 100 MB
});

// Configure JWT Authentication
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("JwtSettings"));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwtSettings = builder.Configuration.GetSection("JwtSettings").Get<JwtSettings>();
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SecretKey))
        };
    });

// Services configuration
builder.Services.Configure<SmtpSettings>(builder.Configuration.GetSection("SmtpSettings"));
builder.Services.AddScoped<IEmailSchedulerService, EmailSchedulerService>();
builder.Services.AddScoped<IAdDirectoryService, AdDirectoryService>();
builder.Services.AddScoped<IAuditPlanService, AuditPlanService>();

// Configure Hangfire (uses Primary connection)
builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseStorage(new OracleStorage(
        builder.Configuration.GetConnectionString("SystemMonitorConnection"),
        new OracleStorageOptions
        {
            TransactionIsolationLevel = IsolationLevel.ReadCommitted,
            QueuePollInterval = TimeSpan.FromSeconds(15),
            JobExpirationCheckInterval = TimeSpan.FromHours(1),
            CountersAggregateInterval = TimeSpan.FromMinutes(5),
            PrepareSchemaIfNecessary = false,   // auto-creates Hangfire tables
            DashboardJobListLimit = 50000,
            TransactionTimeout = TimeSpan.FromMinutes(1),
            SchemaName = "SANMEAIFORMS"
        })));

builder.Services.AddHangfireServer(options =>
{
    options.WorkerCount = 5;
    options.Queues = new[] { "default", "critical" };
});

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseCors("AllowAll");

// Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();

// Enable Swagger
app.UseSwagger();
app.UseSwaggerUI();

// Map API routes
app.MapControllers();

// Fallback for SPA routing
app.MapFallbackToFile("/index.html");

app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    // Allow only authenticated users in production:
    // Authorization = new[] { new HangfireAuthorizationFilter() }
});

app.Run();