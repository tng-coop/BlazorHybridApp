using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL;
using BlazorHybridApp.Client.Pages;
using BlazorHybridApp.Components;
using BlazorHybridApp.Components.Account;
using BlazorHybridApp.Data;
using BlazorHybridApp.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents()
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
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

builder.Services.AddSingleton<IEmailSender, EmailSender>();
builder.Services.AddSingleton<IEmailSender<ApplicationUser>, IdentityEmailSender>();
builder.Services.AddHttpClient<PexelsClient>();

var app = builder.Build();

// Ensure the database is created
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    db.Database.EnsureCreated();
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

app.MapGet("/api/waterfall-video-info", async (PexelsClient client, CancellationToken ct) =>
{
    const int videoId = 6394054;
    var info = await client.GetVideoInfoAsync(videoId, ct);
    return Results.Json(new { url = info.Url, poster = info.Poster });
});

app.MapGet("/api/waterfall-video-url", async (PexelsClient client, CancellationToken ct) =>
{
    const int videoId = 6394054;
    var url = await client.GetVideoUrlAsync(videoId, ct);
    return Results.Json(new { url });
});

app.MapGet("/api/goat-video-url", async (PexelsClient client, CancellationToken ct) =>
{
    const int videoId = 30646036;
    var url = await client.GetVideoUrlAsync(videoId, ct);
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
    .AddInteractiveServerRenderMode() 
    .AddInteractiveWebAssemblyRenderMode()
    .AddAdditionalAssemblies(typeof(BlazorHybridApp.Client._Imports).Assembly);

// Add additional endpoints required by the Identity /Account Razor components.
app.MapAdditionalIdentityEndpoints();

app.Run();
