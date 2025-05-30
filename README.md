# BlazorHybridApp

This sample demonstrates a hybrid Blazor app. Some scripts expect a Pexels API key to download the waterfall image shown in the UI.

Set the key in configuration (e.g. `Pexels:ApiKey` in `appsettings.json`) or via an environment variable:

```bash
export Pexels__ApiKey="<your Pexels API key>"
```

The `Program` exposes `/api/waterfall` which fetches the video thumbnail from Pexels using this key.
It also exposes `/api/waterfall-video` which streams the full video for display in the home page.
