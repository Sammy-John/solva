# Release Rules (Block 1 Baseline)

Date: 2026-03-29
Scope: `solva-construction` desktop app release/update flow

## 1) Branch + Merge Rules

- Do release work on a feature branch (example: `feature/github-release-updates`).
- Push commits before uploading release assets.
- Merge to `main` only after:
  - signed artifacts exist
  - hosted manifest URLs resolve
  - installed-app update path is verified
- After merge, tag the milestone (example: `block1-updateability-complete`).

## 2) Signing Key Rules (Critical)

- Use one long-lived updater signing key.
- Never commit private keys to git.
- Keep private key in secure local path + secure backup.
- Keep public key in:
  - `src-tauri/tauri.conf.json`
  - `src-tauri/tauri.test.conf.json`
- If key is rotated, plan one-time manual installer migration.

## 3) Required Release Sequence (Do Not Reorder)

1. Bump version:
   - `npm version <x.y.z> --no-git-tag-version`
2. Sync Tauri versions:
   - `npm run release:version:sync`
3. Build signed artifacts:
   - Test: `npm run release:alpha:test`
   - Production: `npm run release:alpha`
4. Generate manifest:
   - Test GitHub: `npm run release:manifest:test:github -- --notes "<notes>"`
   - Prod GitHub: `npm run release:manifest:github -- --notes "<notes>"`
5. Upload assets to release.
6. Verify in installed app.

## 4) Required GitHub Assets

### Test channel

- `test-latest.json`
- `Construction Planner Desktop Test_<version>_x64-setup.exe`
- matching `.sig`

### Production channel

- `latest.json`
- `Construction Planner Desktop_<version>_x64-setup.exe`
- matching `.sig`

## 5) Naming/URL Rules

- GitHub release asset names may normalize spaces to dots.
- Manifest generation must use the script mode configured for GitHub filenames.
- Before testing in-app, verify manifest + installer URL return `200`.

## 6) Verification Gate (Every Release)

Minimum pass criteria:

- update check detects correct target version
- download/install completes without errors
- app restarts on new version
- SQLite data remains intact
- backup option still works

## 7) Failure Handling Rules

- `404` during download: check manifest URL vs uploaded asset filenames.
- `resource id ... invalid`: run a fresh `Check for Updates` before install; stale session can occur after failed attempts.
- signature failure: confirm build key matches configured public key.

## 8) Record Keeping Rules

After each release/task completion:

- append entry to `docs/releases/changelog.md`
- update task status in roadmap/plan docs
- keep notes short: version, what changed, verification result, pending items

## 9) Simple "Done" Definition

A release is considered done only when all are true:

- branch pushed
- PR merged
- release assets uploaded
- installed-app update validated (`vN -> vN+1`)
- changelog + plan checklist updated
