# GitHub Releases Update Hosting (Simple Flow)

Repository: `https://github.com/Sammy-John/solva`
Scope: `solva-construction` only

## What this does

Installed app checks GitHub Releases for update manifest:

- Production app endpoint:
  - `https://github.com/Sammy-John/solva/releases/latest/download/latest.json`
- Test app endpoint:
  - `https://github.com/Sammy-John/solva/releases/latest/download/test-latest.json`

## Build + manifest (production)

1. Build signed installer:

```bash
npm run release:alpha
```

2. Generate GitHub-hosted manifest:

```bash
npm run release:manifest:github -- --notes "Release <version>"
```

Outputs:
- `artifacts/<version>/*.exe`
- `artifacts/<version>/*.sig`
- `artifacts/latest.json`

## Build + manifest (test channel)

1. Build signed test installer:

```bash
npm run release:alpha:test
```

2. Generate test manifest for GitHub:

```bash
npm run release:manifest:test:github -- --notes "Test release <version>"
```

Outputs:
- `artifacts/test/<version>/*.exe`
- `artifacts/test/<version>/*.sig`
- `artifacts/test/test-latest.json`

## What to upload to each GitHub Release

Production files:
- `*.exe` (production installer for that version)
- `*.sig` (matching signature)
- `latest.json`

Test files:
- `*Desktop Test*.exe`
- `*Desktop Test*.sig`
- `test-latest.json`

Upload all of the above as assets to the **latest release** in `Sammy-John/solva`.

## First-time checklist

- Ensure app `pubkey` in Tauri configs matches signing key used for `.sig` generation.
- Keep private key in local env/CI secrets (never commit it).
- Use separate test app installer for side-by-side testing.
