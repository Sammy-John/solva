# Test Channel (Isolated Install)

This channel is designed to avoid interference with production installs.

## Isolation settings

- Test config file: `src-tauri/tauri.test.conf.json`
- Test app identifier: `com.teknabu.constructionplannerdesktop.test`
- Test product name: `Construction Planner Desktop Test`
- Test updater endpoint: `https://updates.solva.app/test/latest.json`

Because identifier is different, Windows treats it as a separate app install and data directory.

## Build test installer (signed)

Set signing env vars, then run:

```bash
npm run release:alpha:test
```

Artifacts are copied to:

- `artifacts/test/<version>/`

## Generate test manifest

```bash
npm run release:manifest:test -- --base-url https://updates.solva.app/test --notes "Test channel build <version>"
```

Manifest outputs:

- `artifacts/test/<version>/latest.json`
- `artifacts/test/latest.json`

## Test-machine workflow

1. Install `Construction Planner Desktop Test` (not production installer).
2. Use in-app update flow only.
3. Verify updates happen within test channel endpoint.
4. Verify production install remains untouched.
