# Block1 Updateability / Release Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a reliable Windows update/install flow so weekly client builds can be installed as updates (not clean reinstalls) while preserving local SQLite project data.

**Architecture:** Use Tauri v2 built-in updater for in-app update checks and installs, backed by signed release artifacts hosted on a simple static endpoint (GitHub Releases or equivalent). Keep SQLite in Tauri app data directory as the source of truth; updates replace binaries only. Add minimal UI in the existing storage diagnostics panel for update checks and status messaging.

**Tech Stack:** Tauri v2 (`@tauri-apps/cli`, Rust Tauri crates), React + TypeScript, SQLite via `rusqlite`, PowerShell release scripts, markdown runbooks.

---

### Task 1: Versioning + Release Metadata Baseline

**Files:**
- Modify: `package.json`
- Modify: `src-tauri/tauri.conf.json`
- Create: `scripts/release/sync-version.mjs`
- Create: `docs/releases/versioning.md`

- [x] **Step 1: Write failing guard script (version mismatch should fail)**

Create `scripts/release/sync-version.mjs` with a check mode:
- read `package.json.version`
- read `src-tauri/tauri.conf.json.version`
- exit non-zero with clear message if mismatch

- [x] **Step 2: Run guard to verify current mismatch fails**

Run: `node scripts/release/sync-version.mjs --check`
Expected: FAIL if versions differ (currently likely `0.0.0` vs `1.0.0`).

- [x] **Step 3: Implement sync mode and align versions**

Update script to support `--write` and set `tauri.conf.json.version` from `package.json.version`.
Update `package.json` scripts:
- `release:version:check`
- `release:version:sync`

- [x] **Step 4: Verify sync + check pass**

Run:
- `npm run release:version:sync`
- `npm run release:version:check`
Expected: PASS with identical versions.

- [x] **Step 5: Document version bump workflow**

Write `docs/releases/versioning.md` with exact bump order for alpha iteration.

### Task 2: Enable Tauri Updater Plumbing

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/tauri.conf.json`
- Create: `docs/releases/updater-config.md`

- [x] **Step 1: Add failing build expectation for missing updater wiring**

Run baseline package command before changes:
- `npm run tauri build`
Capture current behavior as reference.

- [x] **Step 2: Add updater dependencies and plugin wiring**

Add updater plugin crates/packages needed for Tauri v2.
Wire updater plugin into `tauri::Builder` in `src-tauri/src/main.rs`.

- [x] **Step 3: Configure updater endpoint + public key**

Add updater config to `src-tauri/tauri.conf.json`:
- update endpoint URL
- signature/public key config
- platform target compatibility

Keep endpoint simple (static JSON manifest served from release hosting).

- [x] **Step 4: Verify build and installer generation still pass**

Run: `npm run tauri build`
Expected: PASS with NSIS installer and updater metadata generated.
Verification result: PASS after setting signer env vars (`TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`); NSIS installer and `.sig` updater signature were generated.

- [x] **Step 5: Document environment requirements**

Write `docs/releases/updater-config.md` covering:
- signing key generation and secure storage
- required CI/local env vars
- endpoint layout examples

### Task 3: Add Minimal In-App Update UX

**Files:**
- Create: `src/lib/updater.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Create: `src/lib/updater.test.ts`

- [x] **Step 1: Write failing tests for updater state transitions**

In `src/lib/updater.test.ts`, add tests for:
- no update available
- update available
- download/install success
- network/signature failure state mapping

- [x] **Step 2: Run tests to confirm failures**

Run: `npm run test -- src/lib/updater.test.ts`
Expected: FAIL (new module not implemented yet).

- [x] **Step 3: Implement updater service wrapper**

Create `src/lib/updater.ts`:
- `checkForAppUpdate()`
- `downloadAndInstallUpdate()`
- typed status/error mapping for UI

Keep module isolated so App UI stays simple.

- [x] **Step 4: Integrate update controls into storage panel**

In `src/App.tsx` add:
- current app version label
- `Check for updates` button
- `Install update` action when available
- clear status text for success/failure/restart needed

In `src/App.css` add scoped styles matching existing storage panel visual language.

- [x] **Step 5: Verify tests + app build**

Run:
- `npm run test -- src/lib/updater.test.ts`
- `npm run build`
Expected: PASS.

### Task 4: Create Repeatable Release + Update Smoke Path

**Files:**
- Create: `scripts/release/build-alpha.ps1`
- Create: `scripts/release/publish-manifest.mjs`
- Create: `docs/releases/update-smoke-test.md`
- Modify: `package.json`

- [x] **Step 1: Script local alpha build command**

Create `scripts/release/build-alpha.ps1` to:
- run version check
- run test/build
- run `tauri build`
- copy release outputs to a deterministic folder (`artifacts/<version>/`)

- [x] **Step 2: Script update manifest generation/publish prep**

Create `scripts/release/publish-manifest.mjs` to:
- generate/update manifest JSON pointing to installer/update artifacts
- validate required signature fields are present

- [x] **Step 3: Add npm scripts for one-command release flow**

In `package.json` add:
- `release:alpha`
- `release:manifest`

- [x] **Step 4: Write smoke-test checklist (vN -> vN+1)**

Create `docs/releases/update-smoke-test.md` with exact procedure:
1. Install vN clean
2. Create sample project + schedule row + snapshot
3. Publish vN+1 update artifacts
4. Run in-app update
5. Verify same data remains and app version changed
6. Verify rollback path if update fails

- [x] **Step 5: Execute first smoke run and record evidence**

Store results in the checklist doc (date, versions tested, pass/fail, notes).
Current evidence recorded for packaging + manifest path; full in-app vN->vN+1 validation is tracked as follow-up in the smoke-test doc.

### Task 5: Data Preservation Hardening (Minimal)

**Files:**
- Modify: `src/lib/projectsDb.ts`
- Modify: `src-tauri/src/main.rs`
- Create: `docs/releases/data-preservation.md`

- [x] **Step 1: Add pre-update storage health probe**

Before install action, verify `init_database` works and `list_projects` returns successfully.
If probe fails, block update and show actionable message.

- [x] **Step 2: Add lightweight backup command in Rust**

Add a Tauri command in `main.rs` to copy `construction-planner.db` to a timestamped backup in app data dir.
Expose it for pre-install use only.

- [x] **Step 3: Wire optional backup-before-install toggle**

In `projectsDb.ts`/updater flow, trigger backup prior to install; if backup fails, continue only with explicit user confirmation (alpha-safe default: block).

- [ ] **Step 4: Verify backup + restore manual drill**

Manual test:
- create project data
- run backup
- corrupt/replace DB intentionally in test machine
- restore from backup file
- verify project/schedule integrity
Status: pending manual execution on a live installed app machine.

- [x] **Step 5: Document operator runbook**

Create `docs/releases/data-preservation.md` with:
- data folder path
- backup file naming
- restore steps
- troubleshooting for failed updates

### Task 6: Final Block1 Acceptance Gate

**Files:**
- Create: `docs/releases/block1-acceptance.md`

- [x] **Step 1: Define pass/fail checklist against roadmap requirements**

Map directly to Block1 “Done when”:
- update applied without clean reinstall workflow
- local state preserved
- repeatable update testing path exists

- [ ] **Step 2: Run acceptance on two consecutive versions**

Test sequence: `vA -> vB -> vC` on same machine.
Expected: all updates apply and data remains intact across each update.
Current status: version progression release-path verification completed for vA->vB->vC (1.0.0->1.0.1->1.0.2); live in-app update/data integrity validation still pending installed-machine run.

- [x] **Step 3: Produce founder handoff notes**

Record in `docs/releases/block1-acceptance.md`:
- commands used
- tested versions/dates
- known limitations (alpha scope)
- what to do before each client drop

- [ ] **Step 4: Commit plan completion artifacts**

Commit docs/scripts/config updates as separate focused commits.

## Scope Guardrails For Block1

- Keep updater channel single-track (no staged channels this weekend).
- No full CI/CD platform buildout; scripts + runbooks are enough.
- No database schema redesign for Block1.
- No cross-platform packaging expansion unless Windows flow is stable first.

## Recommended Execution Order (Weekend)

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6













