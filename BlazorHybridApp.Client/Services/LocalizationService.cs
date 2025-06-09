using System.Globalization;
using Microsoft.JSInterop;

namespace BlazorHybridApp.Client.Services;

public class LocalizationService
{
    private readonly IJSRuntime _js;
    private bool _loaded;
    public event Action? OnChange;

    public LocalizationService(IJSRuntime js)
    {
        _js = js;
        CurrentCulture = CultureInfo.CurrentCulture;
    }

    public CultureInfo CurrentCulture { get; private set; }

    public async Task LoadCultureAsync()
    {
        if (_loaded)
        {
            return;
        }

        var culture = await _js.InvokeAsync<string>("localization.getPreferredLanguage");
        if (string.IsNullOrEmpty(culture))
        {
            var langs = await _js.InvokeAsync<string[]>("localization.getBrowserLanguages");
            if (langs != null && langs.Any(l => l.StartsWith("ja", StringComparison.OrdinalIgnoreCase)))
            {
                culture = "ja";
            }
            else
            {
                culture = "en";
            }
        }

        SetThreadCulture(culture);
        _loaded = true;
        OnChange?.Invoke();
    }

    public async Task SetCultureAsync(string culture)
    {
        await _js.InvokeVoidAsync("localization.setPreferredLanguage", culture);
        SetThreadCulture(culture);
        OnChange?.Invoke();
    }

    private void SetThreadCulture(string culture)
    {
        var cultureInfo = new CultureInfo(culture);
        CultureInfo.DefaultThreadCurrentCulture = cultureInfo;
        CultureInfo.DefaultThreadCurrentUICulture = cultureInfo;
        CurrentCulture = cultureInfo;
    }
}
