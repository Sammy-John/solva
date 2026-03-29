# Block1 Acceptance Gate

Date: 2026-03-29
Scope: Block1 (Updateability / release flow)

## Roadmap Criteria Mapping

### 1) Update applied without clean reinstall workflow

Status: Partial

Evidence:
- Built and signed three consecutive versions using the same scripted flow:
  - `1.0.0`
  - `1.0.1`
  - `1.0.2`
- Generated updater manifests for each version and latest pointer (`artifacts/latest.json`).

Remaining to fully pass:
- Live in-app update execution on installed app machine (vN installed, then app updates to vN+1 through updater endpoint).

### 2) Local state preserved

Status: Partial

Evidence:
- Added pre-install safety gate:
  - health probe (`init_database` + `list_projects`)
  - backup-before-install (default enabled)
- Added restore runbook and backup naming standard.

Remaining to fully pass:
- Manual drill on installed app machine proving restore + post-update data integrity in real use.

### 3) Repeatable update testing path exists

Status: Pass

Evidence:
- Repeatable scripts and docs:
  - `npm run release:version:sync`
  - `npm run release:alpha`
  - `npm run release:manifest -- --base-url <url> --notes <text>`
  - `docs/releases/update-smoke-test.md`
  - `docs/releases/data-preservation.md`

## Acceptance Run (vA -> vB -> vC)

Sequence executed:
- vA: `1.0.0` (baseline)
- vB: `1.0.1`
- vC: `1.0.2`

Run date: 2026-03-29

Commands used:

```bash
npm version patch --no-git-tag-version
npm run release:version:sync
npm run release:alpha
npm run release:manifest -- --base-url https://updates.solva.app --notes "Alpha acceptance pass <version>"
```

Artifacts verified:
- `artifacts/1.0.1/Construction Planner Desktop_1.0.1_x64-setup.exe`
- `artifacts/1.0.1/Construction Planner Desktop_1.0.1_x64-setup.exe.sig`
- `artifacts/1.0.1/latest.json`
- `artifacts/1.0.2/Construction Planner Desktop_1.0.2_x64-setup.exe`
- `artifacts/1.0.2/Construction Planner Desktop_1.0.2_x64-setup.exe.sig`
- `artifacts/1.0.2/latest.json`
- `artifacts/latest.json`

## Known Limitations (Alpha Scope)

- In-session validation did not include a full live installed-app update execution against a hosted endpoint.
- Data-preservation backup/restore drill still requires manual execution on a real installed app environment.
- Public key currently uses local test key; production key rotation and CI secret setup are still required before client rollout.

## Founder Handoff: Before Each Client Drop

1. Confirm version bump and sync:
   - `npm version patch --no-git-tag-version`
   - `npm run release:version:sync`
   - `npm run release:version:check`
2. Build signed artifacts:
   - set `TAURI_SIGNING_PRIVATE_KEY`
   - set `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
   - run `npm run release:alpha`
3. Generate manifest with release notes:
   - `npm run release:manifest -- --base-url <hosted-update-url> --notes "<release notes>"`
4. Publish `.exe`, `.sig`, and `latest.json` to update host.
5. Execute smoke checklist in `docs/releases/update-smoke-test.md`.
6. Record outcomes in `docs/releases/changelog.md` and this acceptance doc if criteria status changes.
