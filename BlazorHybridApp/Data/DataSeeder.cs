using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

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
}
