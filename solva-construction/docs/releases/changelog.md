# Release Changelog

Tracks completed changes by release and task completion.

## 2026-03-28 - Block1 Task 1 Complete

**Version:** `1.0.0`
**Plan Task:** `Task 1 - Versioning + Release Metadata Baseline`

### Completed
- Added version guard/sync script: `scripts/release/sync-version.mjs`
- Added npm scripts:
  - `release:version:check`
  - `release:version:sync`
- Synced app versioning to `1.0.0` across:
  - `package.json`
  - `src-tauri/tauri.conf.json`
- Added versioning runbook: `docs/releases/versioning.md`
- Verified mismatch failure and passing sync/check flow.

### Verification Notes
- `node scripts/release/sync-version.mjs --check` failed before sync due to mismatch (`0.0.0` vs `1.0.0`).
- `npm run release:version:sync` passed.
- `npm run release:version:check` passed.

---

## Entry Template

Copy this block for each completed release/task:

```md
## YYYY-MM-DD - [Block/Release] [Task] Complete

**Version:** `x.y.z`
**Plan Task:** `Task N - Name`

### Completed
- [change]
- [change]

### Verification Notes
- `[command]` [result]
- `[command]` [result]

### Follow-ups (optional)
- [next step]
- [risk or note]
```

## 2026-03-28 - Block1 Task 2 Complete

**Version:** `1.0.0`
**Plan Task:** `Task 2 - Enable Tauri Updater Plumbing`

### Completed
- Added updater plugin dependencies:
  - Rust: `tauri-plugin-updater = "2"`
  - JS: `@tauri-apps/plugin-updater`
- Wired updater plugin in backend builder (`src-tauri/src/main.rs`).
- Updated Tauri config:
  - `bundle.createUpdaterArtifacts = true`
  - `plugins.updater.pubkey`
  - `plugins.updater.endpoints`
  - `plugins.updater.windows.installMode`
- Added updater runbook: `docs/releases/updater-config.md`.

### Verification Notes
- Baseline pre-wiring build failed in old setup with plugin permission path issue.
- After updater wiring + clean rebuild: app compile and NSIS bundle succeeded.
- Final verification build passed with signing env vars set and generated updater signature (`.sig`).

### Follow-ups
- Replace local test public key in `tauri.conf.json` with your production updater public key.
- Configure signing env vars in CI for release builds.


