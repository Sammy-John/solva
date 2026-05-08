# Release Changelog

Tracks completed changes by release and task completion.


## 2026-04-16 - Release 1.1.1

**Version:** `1.1.1`
**Plan Task:** `Patch release - schedule editing clarity + dependency cascade fix`

### Completed
- Added a new `Task` action column before `Move` and narrowed the `Status` column to free up schedule space.
- Added inline `+` action on task rows to create a new task directly below the clicked row in the same section.
- Refined Move mode UX:
  - removed persistent move label/banner
  - strengthened active move button state
  - moved guidance into a centered viewport popup that stays visible while the schedule remains clickable
- Fixed dependency cascade behavior so auto-shift successors now move earlier as well as later when upstream dates or durations change.
- Added lightweight blocked-edit guidance for constrained start-date edits:
  - anchored callout on the edited cell
  - earliest allowed date
  - blocker task name
  - direct `Go to blocker` action
- Synced app/build metadata to `1.1.1` across app and Tauri config used for release packaging.

### Verification Notes
- `npm run test` PASS (`31 passed`)
- `npm run build` PASS
- `npm run release:alpha:test` PASS
- `npm run release:alpha` PASS

### Follow-ups
- Gather client feedback on the blocked-edit callout before expanding the same pattern to duration/end-date edits.
- Publish/update production release manifest when ready for hosted updater rollout.

---
## 2026-04-14 - Release 1.1.0 (MVP)

**Version:** `1.1.0`
**Plan Task:** `Release 1.1 - MVP ready for selling`

### Completed
- Replaced unreliable drag-and-drop with explicit **Move mode** (click grip → click destination).
- Added clear Move mode feedback + cancellation (Esc + banner) and improved reliability in Tauri.
- Added Solva branding tokens + fonts (Oswald label, Playfair headings, Lato body).
- Redesigned Projects dashboard for desktop viewport and Solva color scheme.
- Reworked Project planning view:
  - Teams-style left sidebar (snapshot actions, export, guide, settings placeholder)
  - Project header + filters/toggles (with confirmation for Workdays only)
- Table upgrades:
  - Smart Blue table header + section styling
  - Task-type color applied to Task column only (Inspection > Ordering > Delivery > General)
  - Added read-only **Waiting On** column from predecessor dependencies
  - Added inline header help tooltips (`?`) for key columns (especially Move)
- App now opens **maximized** by default (prod + test configs)

### Verification Notes
- `npm run release:version:check` PASS
- `npm run build` PASS

---
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



## 2026-03-28 - Block1 Task 3 Complete

**Version:** `1.0.0`
**Plan Task:** `Task 3 - Add Minimal In-App Update UX`

### Completed
- Added updater wrapper module: `src/lib/updater.ts`.
- Added updater tests: `src/lib/updater.test.ts`.
- Integrated update controls into storage panel in `src/App.tsx`:
  - Current app version display
  - Check for updates action
  - Install update action when an update is available
  - Status messaging for check/install outcomes
- Added updater panel styles in `src/App.css`.
- Fixed pre-existing Vitest include path in `vitest.config.ts` from legacy path to `src/**/*.{test,spec}.ts` so tests are discoverable.

### Verification Notes
- RED: `npm run test -- src/lib/updater.test.ts` failed initially (`Cannot find package '@/lib/updater'`).
- GREEN tests: `npm run test -- src/lib/updater.test.ts` passed (`4 passed`).
- Build: `npm run build` passed.

### Follow-ups
- Wire optional auto-check-on-launch behavior after manual flow is validated with clients.

## 2026-03-28 - Block1 Task 4 Complete

**Version:** `1.0.0`
**Plan Task:** `Task 4 - Create Repeatable Release + Update Smoke Path`

### Completed
- Added alpha build script: `scripts/release/build-alpha.ps1`.
- Added manifest generator: `scripts/release/publish-manifest.mjs`.
- Added npm scripts:
  - `release:alpha`
  - `release:manifest`
- Added smoke test runbook: `docs/releases/update-smoke-test.md`.
- Executed first scripted release + manifest run and recorded evidence.

### Verification Notes
- `npm run release:alpha` passed, including:
  - version check
  - test run
  - app build
  - signed Tauri bundle (`.exe` + `.sig`)
  - artifact copy to `artifacts/1.0.0/`
- `npm run release:manifest -- --base-url https://updates.solva.app --notes "Alpha smoke run 1.0.0"` passed.
- Manifest files produced:
  - `artifacts/1.0.0/latest.json`
  - `artifacts/latest.json`

### Follow-ups
- Execute full in-app update validation with two versions (`vN` installed, then `vN+1` update) on a separate machine.
- Verify data-preservation checks during that end-to-end run.

## 2026-03-28 - Block1 Task 5 In Progress (Step 4 Pending)

**Version:** `1.0.0`
**Plan Task:** `Task 5 - Data Preservation Hardening (Minimal)`

### Completed
- Added update preflight gate in `src/lib/projectsDb.ts` (`prepareForUpdateInstall`):
  - verifies `init_database`
  - verifies `list_projects`
  - creates DB backup before install when enabled
- Added Rust backup command in `src-tauri/src/main.rs`:
  - `backup_database`
  - creates timestamped `construction-planner-backup-YYYYMMDD-HHMMSS.db`
- Wired backup safety flow into install handler in `src/App.tsx`.
- Added backup-before-install toggle (default on) in storage panel UI.
- Added runbook: `docs/releases/data-preservation.md`.

### Verification Notes
- `npm run test` passed.
- `npm run build` passed.
- Signed `npm run tauri build` passed.

### Pending
- Manual backup + restore drill (Step 4) on a live installed app machine.

## 2026-03-29 - Block1 Task 6 In Progress (Live Acceptance Pending)

**Version:** `1.0.2`
**Plan Task:** `Task 6 - Final Block1 Acceptance Gate`

### Completed
- Created acceptance gate doc: `docs/releases/block1-acceptance.md`.
- Defined pass/fail mapping directly to roadmap Block1 criteria.
- Produced founder handoff checklist and release commands.
- Executed two consecutive version progression runs:
  - `1.0.0 -> 1.0.1`
  - `1.0.1 -> 1.0.2`
- Generated signed artifacts and manifests for both versions.

### Verification Notes
- `npm version patch --no-git-tag-version` (twice)
- `npm run release:version:sync` (twice)
- `npm run release:alpha` (twice) passed with signed `.exe` + `.sig`
- `npm run release:manifest -- --base-url https://updates.solva.app --notes "Alpha acceptance pass <version>"` (twice) passed

### Pending
- Full installed-app in-place updater validation (`vN -> vN+1`) against hosted endpoint.
- Final manual data-preservation drill on installed app machine.

## 2026-03-29 - Isolated Test Channel Setup

### Completed
- Added isolated Tauri config: `src-tauri/tauri.test.conf.json`
  - identifier: `com.teknabu.constructionplannerdesktop.test`
  - productName/title: `Construction Planner Desktop Test`
  - updater endpoint: `https://updates.solva.app/test/latest.json`
- Extended version sync to include both prod and test configs.
- Added test release scripts:
  - `release:alpha:test`
  - `release:manifest:test`
- Added test runbook: `docs/releases/test-channel.md`.

### Verification Notes
- `npm run release:version:sync` updated both configs to `1.0.2`.
- `npm run release:alpha:test` passed and produced signed test installer artifacts.
- `npm run release:manifest:test -- --base-url https://updates.solva.app/test --notes "Test channel acceptance 1.0.2"` passed.

## 2026-03-29 - Updater Key Recovery + Hardening (Test v1.0.3)

### Completed
- Generated new permanent updater signing key pair on maintainer machine:
  - private key: `C:\Users\Sammy John\.solva-keys\solva-updater-private.key`
  - public key: `C:\Users\Sammy John\.solva-keys\solva-updater-private.key.pub`
- Updated updater `pubkey` in both configs:
  - `src-tauri/tauri.conf.json`
  - `src-tauri/tauri.test.conf.json`
- Hardened release scripts so `TAURI_SIGNING_PRIVATE_KEY_PATH` mode auto-loads key content for Tauri signing:
  - `scripts/release/build-alpha.ps1`
  - `scripts/release/build-alpha-test.ps1`
- Built signed test-channel installer for `1.0.3` and generated GitHub test manifest.

### Verification Notes
- `npm run release:alpha:test` passed and produced:
  - `artifacts/test/1.0.3/Construction Planner Desktop Test_1.0.3_x64-setup.exe`
  - `artifacts/test/1.0.3/Construction Planner Desktop Test_1.0.3_x64-setup.exe.sig`
- `npm run release:manifest:test:github -- --notes "Test update 1.0.3 (new permanent updater key)"` passed.

### Important Migration Note
- Because the original signing private key was unavailable, updater key identity changed.
- Existing `1.0.2` installs will need a one-time manual installer move to `1.0.3`.
- After that one-time move, future updates can use the new key normally.

## 2026-03-29 - Block2 Tasks 1-5 Complete

**Version:** `1.0.5`
**Plan Task:** `Block2 - Dependency Trust & Usability (Tasks 1-5)`

### Completed
- Implemented task-profile-first dependency workflow so users can add/edit/remove links directly in Task Profile.
- Added builder-friendly dependency language helpers and replaced technical terms in core dependency views.
- Added cascade movement summaries (`from -> to`) with explicit upstream reason metadata.
- Upgraded cascade toast to show concise, task-level "what changed and why" details.
- Added dependency conflict explanation helper with clear table tooltip and task-profile guidance text.
- Added deterministic cascade guardrails:
  - stable affected-task ordering
  - stable movement summary ordering
  - no duplicate movement summaries for revisited tasks
- Expanded scheduling tests to cover cascade explainability and trust guardrails.

### Verification Notes
- `npm run test -- src/lib/dependencyUx.test.ts` PASS
- `npm run test -- src/lib/scheduling.test.ts` PASS (6 tests)
- `npm run test` PASS
- `npm run build` PASS

### Follow-ups
- Run `docs/releases/block2-dependency-smoke-test.md` on installed app build with realistic project data.
- Complete Block2 Task 6 final acceptance checklist and release handoff.

## 2026-04-09 - Block3+4 Combined: Date-Critical Parity (Inspection + Ordering/Delivery)

**Version:** `1.0.5`
**Plan Task:** `Block3+4 Combined - Date-Critical Task Consistency`

### Completed
- Combined Block3 and Block4 implementation direction into one date-critical task stream.
- Updated scheduling classification so `Inspection` is treated as date-critical alongside `Ordering` and `Delivery`.
- Preserved existing urgency model with Ordering-specific thresholds and shared Delivery/Inspection thresholds.
- Updated urgency tooltip labeling to correctly use `Inspection` wording.
- Added focused scheduling tests for Inspection parity:
  - missing-date detection
  - overdue detection
  - urgency + tooltip messaging

### Verification Notes
- `npm run test -- src/lib/scheduling.test.ts` PASS (`9 passed`)

### Follow-ups
- Run full verification (`npm run test`, `npm run build`) before release prep.
- Continue combined Block3+4 work for any additional UX refinements requested by client.

## 2026-04-09 - Block5 Scheduling Consistency + Workdays

**Version:** `1.0.5`
**Plan Task:** `Block5 - Inline Date Consistency + Weekend Counting Option`

### Completed
- Added weekend-aware lag helper and threaded weekend mode through cascade/dependency validation logic.
- Added store-level `excludeWeekends` mode and wired recalculation for inline date edits (`start`, `end`, `duration`) plus cascade updates.
- Added `Workdays only` toggle in schedule header and connected it through Index/store.
- Updated dependency modal preview to use the same weekend-aware lag calculation as schedule logic.
- Repaired malformed ScheduleTable/Index edits so schedule UI compiles cleanly.

### Verification Notes
- `npm run test -- src/lib/scheduling.test.ts` PASS (`9 passed`)
- `npm run test` PASS (`16 passed`)
- `npm run build` PASS

### Follow-ups
- Manual installed-app UX pass for inline date edit behavior and weekend mode interactions on real project data.



