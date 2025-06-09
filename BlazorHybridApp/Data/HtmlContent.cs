namespace BlazorHybridApp.Data;

public class HtmlContent : IContent, IHtmlContent
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Html { get; set; } = string.Empty;
}
