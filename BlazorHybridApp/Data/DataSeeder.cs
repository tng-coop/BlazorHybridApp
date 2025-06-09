using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Identity;
using System.Linq;

using BlazorHybridApp.Services;

namespace BlazorHybridApp.Data;

public static class DataSeeder
{
    public static async Task SeedBackgroundVideosAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var client = scope.ServiceProvider.GetRequiredService<PexelsClient>();

        if (await db.BackgroundVideos.AnyAsync(cancellationToken))
            return;

        var waterfallInfo = await client.GetVideoInfoAsync(6394054, cancellationToken);
        var goatUrl = await client.GetVideoUrlAsync(30646036, cancellationToken);

        db.BackgroundVideos.Add(new BackgroundVideo
        {
            Name = "waterfall",
            Url = waterfallInfo.Url,
            Poster = waterfallInfo.Poster
        });

        db.BackgroundVideos.Add(new BackgroundVideo
        {
            Name = "goat",
            Url = goatUrl
        });

        await db.SaveChangesAsync(cancellationToken);
    }

    public static async Task SeedDefaultUsersAsync(IServiceProvider services, string password, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

        foreach (var role in new[] { "admin", "editor" })
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }

        var users = new (string Email, string Role)[]
        {
            ("admin@example.com", "admin"),
            ("admin2@example.com", "admin"),
            ("editor@example.com", "editor"),
            ("editor2@example.com", "editor")
        };

        foreach (var (email, role) in users)
        {
            var user = await userManager.FindByEmailAsync(email);
            if (user is null)
            {
                user = new ApplicationUser { UserName = email, Email = email, EmailConfirmed = true };
                var result = await userManager.CreateAsync(user, password);
                if (!result.Succeeded)
                {
                    var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                    throw new InvalidOperationException($"Failed to create user {email}: {errors}");
                }
            }

            if (!await userManager.IsInRoleAsync(user, role))
            {
                await userManager.AddToRoleAsync(user, role);
            }
        }
    }
}
