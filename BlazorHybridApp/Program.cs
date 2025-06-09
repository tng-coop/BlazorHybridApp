using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.EntityFrameworkCore;
using BlazorHybridApp.Components;
using BlazorHybridApp.Components.Account;
using BlazorHybridApp.Services;
using BlazorHybridApp.Data;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Components.Server.ProtectedBrowserStorage;
using BlazorHybridApp.Client.Services;

const int WaterfallVideoId = 6394054;
const int GoatVideoId = 30646036;
var isDatabaseAvailable = true;

var builder = WebApplication.CreateBuilder(args);

var defaultUserPassword = builder.Configuration["DefaultUser:Password"];
if (string.IsNullOrWhiteSpace(defaultUserPassword))
{
    throw new InvalidOperationException("DefaultUser__Password environment variable must be set.");
}

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveWebAssemblyComponents()
    .AddAuthenticationStateSerialization();

builder.Services.AddCascadingAuthenticationState();
builder.Services.AddScoped<IdentityUserAccessor>();
builder.Services.AddScoped<IdentityRedirectManager>();

builder.Services.AddAuthentication(options =>
    {
        options.DefaultScheme = IdentityConstants.ApplicationScheme;
        options.DefaultSignInScheme = IdentityConstants.ExternalScheme;
    })
    .AddIdentityCookies();
builder.Services.AddAuthorization();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));
builder.Services.AddDatabaseDeveloperPageExceptionFilter();

builder.Services.AddIdentityCore<ApplicationUser>(options => options.SignIn.RequireConfirmedAccount = true)
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

builder.Services.AddSingleton<IEmailSender, EmailSender>();
builder.Services.AddSingleton<IEmailSender<ApplicationUser>, IdentityEmailSender>();
builder.Services.AddHttpClient<PexelsClient>();
builder.Services.AddScoped<ProtectedLocalStorage>();
builder.Services.AddScoped<LocalizationService>();
var app = builder.Build();

// Attempt to initialize the database; continue even if it fails
using (var scope = app.Services.CreateScope())
{
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Database.EnsureCreated();
        DataSeeder.SeedBackgroundVideosAsync(scope.ServiceProvider).GetAwaiter().GetResult();
        DataSeeder.SeedDefaultUsersAsync(scope.ServiceProvider, defaultUserPassword).GetAwaiter().GetResult();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseWebAssemblyDebugging();
    app.UseMigrationsEndPoint();
}
else
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();


app.UseAntiforgery();

app.MapStaticAssets();

app.MapGet("/api/waterfall-video-info", async (ApplicationDbContext db, PexelsClient client, CancellationToken ct) =>
{
    if (isDatabaseAvailable)
    {
        try
        {
            var info = await db.BackgroundVideos.FirstOrDefaultAsync(v => v.Name == "waterfall", ct);
            if (info is not null)
            {
                return Results.Json(new { url = info.Url, poster = info.Poster });
            }
        }
        catch
        {
            // fall back to Pexels
        }
    }

    var videoInfo = await client.GetVideoInfoAsync(WaterfallVideoId, ct);
    return Results.Json(new { url = videoInfo.Url, poster = videoInfo.Poster });
});

app.MapGet("/api/waterfall-video-url", async (ApplicationDbContext db, PexelsClient client, CancellationToken ct) =>
{
    if (isDatabaseAvailable)
    {
        try
        {
            var info = await db.BackgroundVideos.FirstOrDefaultAsync(v => v.Name == "waterfall", ct);
            if (info is not null)
            {
                return Results.Json(new { url = info.Url });
            }
        }
        catch
        {
            // fall back to Pexels
        }
    }

    var url = await client.GetVideoUrlAsync(WaterfallVideoId, ct);
    return Results.Json(new { url });
});

app.MapGet("/api/goat-video-url", async (ApplicationDbContext db, PexelsClient client, CancellationToken ct) =>
{
    if (isDatabaseAvailable)
    {
        try
        {
            var info = await db.BackgroundVideos.FirstOrDefaultAsync(v => v.Name == "goat", ct);
            if (info is not null)
            {
                return Results.Json(new { url = info.Url });
            }
        }
        catch
        {
            // fall back to Pexels
        }
    }

    var url = await client.GetVideoUrlAsync(GoatVideoId, ct);
    return Results.Json(new { url });
});

app.MapPost("/api/upload-test", async (HttpContext context) =>
{
    long count = 0;
    var buffer = new byte[16 * 1024];
    int read;
    while ((read = await context.Request.Body.ReadAsync(buffer, context.RequestAborted)) > 0)
    {
        count += read;
    }
    return Results.Json(new { received = count });
}).DisableAntiforgery();

app.MapRazorComponents<App>()
    .AddInteractiveWebAssemblyRenderMode()
    .AddAdditionalAssemblies(typeof(BlazorHybridApp.Client._Imports).Assembly);

// Add additional endpoints required by the Identity /Account Razor components.
app.MapAdditionalIdentityEndpoints();

app.Run();
