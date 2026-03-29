# Versioning Workflow

Use one version number across:
- `package.json` (`version`)
- `src-tauri/tauri.conf.json` (`version`)

The source of truth is `package.json`.

## Pre-release checklist

1. Decide next semantic version (for alpha usually patch bumps).
2. Update `package.json` version.
3. Run `npm run release:version:sync`.
4. Run `npm run release:version:check`.
5. Build and test release artifacts.

## Recommended commands

```bash
npm version patch --no-git-tag-version
npm run release:version:sync
npm run release:version:check
```

## Why this matters

Tauri updater compares versions when checking remote updates. If app/package versions drift, update checks become unreliable.

## Fast failure behavior

- `npm run release:version:check` fails when versions do not match.
- `npm run release:version:sync` writes `tauri.conf.json` from `package.json`.
