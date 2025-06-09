# Codex Instructions

- Do **not** run `npm ci` or `npm install` during testing or setup.
- Node/NPM is only present for optional Playwright tests and is not required for building or running the application.
- Only run `dotnet test` when the `dotnet` command is available in the container.
