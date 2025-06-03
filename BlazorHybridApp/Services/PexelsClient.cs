using System.Text.Json;

namespace BlazorHybridApp.Services;

public record VideoInfo(string Url, string Poster);

public class PexelsClient(HttpClient httpClient, IConfiguration configuration)
{
    private readonly HttpClient _httpClient = httpClient;
    private readonly string? _apiKey = configuration["Pexels:ApiKey"];
    private const string BaseUrl = "https://api.pexels.com/videos/videos/";

    public async Task<string> GetVideoUrlAsync(int videoId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            throw new InvalidOperationException("Pexels API key not configured");
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, $"{BaseUrl}{videoId}");
        request.Headers.Add("Authorization", _apiKey);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        var videoFiles = doc.RootElement.GetProperty("video_files");

        foreach (var file in videoFiles.EnumerateArray())
        {
            if (file.TryGetProperty("link", out var linkElement))
            {
                var link = linkElement.GetString();
                if (!string.IsNullOrEmpty(link))
                {
                    return link;
                }
            }
        }

        throw new InvalidOperationException("Video file url missing in Pexels response");
    }

    public async Task<VideoInfo> GetVideoInfoAsync(int videoId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            throw new InvalidOperationException("Pexels API key not configured");
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, $"{BaseUrl}{videoId}");
        request.Headers.Add("Authorization", _apiKey);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        var image = doc.RootElement.GetProperty("image").GetString() ?? string.Empty;
        var videoFiles = doc.RootElement.GetProperty("video_files");

        foreach (var file in videoFiles.EnumerateArray())
        {
            if (file.TryGetProperty("link", out var linkElement))
            {
                var link = linkElement.GetString();
                if (!string.IsNullOrEmpty(link))
                {
                    return new VideoInfo(link, image);
                }
            }
        }

        throw new InvalidOperationException("Video file url missing in Pexels response");
    }
}
