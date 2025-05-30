using System.Text.Json;

namespace BlazorHybridApp.Services;

public class PexelsClient(HttpClient httpClient, IConfiguration configuration)
{
    private readonly HttpClient _httpClient = httpClient;
    private readonly string? _apiKey = configuration["Pexels:ApiKey"];
    private const string BaseUrl = "https://api.pexels.com/videos/videos/";

    public async Task<(byte[] Data, string ContentType)> GetVideoThumbnailAsync(int videoId, CancellationToken cancellationToken = default)
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
        var imageUrl = doc.RootElement.GetProperty("image").GetString();
        if (string.IsNullOrEmpty(imageUrl))
        {
            throw new InvalidOperationException("Image url missing in Pexels response");
        }

        using var imgRequest = new HttpRequestMessage(HttpMethod.Get, imageUrl);
        using var imgResponse = await _httpClient.SendAsync(imgRequest, cancellationToken);
        imgResponse.EnsureSuccessStatusCode();
        var bytes = await imgResponse.Content.ReadAsByteArrayAsync(cancellationToken);
        var contentType = imgResponse.Content.Headers.ContentType?.ToString() ?? "image/jpeg";
        return (bytes, contentType);
    }

    public async Task<(byte[] Data, string ContentType)> GetVideoAsync(int videoId, CancellationToken cancellationToken = default)
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

        string? videoUrl = null;
        foreach (var file in videoFiles.EnumerateArray())
        {
            if (file.TryGetProperty("link", out var linkElement))
            {
                var link = linkElement.GetString();
                if (!string.IsNullOrEmpty(link))
                {
                    videoUrl = link;
                    break;
                }
            }
        }

        if (string.IsNullOrEmpty(videoUrl))
        {
            throw new InvalidOperationException("Video file url missing in Pexels response");
        }

        using var videoRequest = new HttpRequestMessage(HttpMethod.Get, videoUrl);
        using var videoResponse = await _httpClient.SendAsync(videoRequest, cancellationToken);
        videoResponse.EnsureSuccessStatusCode();
        var bytes = await videoResponse.Content.ReadAsByteArrayAsync(cancellationToken);
        var contentType = videoResponse.Content.Headers.ContentType?.ToString() ?? "video/mp4";
        return (bytes, contentType);
    }
}
