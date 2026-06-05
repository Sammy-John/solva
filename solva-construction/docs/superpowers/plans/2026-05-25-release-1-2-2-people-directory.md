# Release 1.2.2 People Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a master People directory with per-project active/inactive membership, legacy upgrade safety, snapshot-safe restore, and refreshed People UI.

**Architecture:** Keep schedule task assignments as stable person IDs. Add project membership state to the existing persisted schedule payload so snapshots restore the worksheet and project team together, while the master directory is stored separately. Migrate current project-level people into the master directory only after explicit approval.

**Tech Stack:** React 19, Zustand, Vitest, Testing Library, Tauri SQLite commands, localStorage browser fallback.

---

## File Structure

- `src/types/scheduling.ts`: extend `Person` with directory fields and add `ProjectPersonMembership`.
- `src/lib/peopleDirectory.ts`: new focused library for master directory storage, project membership helpers, legacy migration planning, active/inactive filtering, and assignment removal guardrails.
- `src/lib/peopleDirectory.test.ts`: unit tests for migration/idempotency, membership, active assignment filtering, archive behavior, and removal warnings.
- `src/lib/scheduleDb.ts`: include project people membership in save/load/snapshot payloads without breaking legacy payloads.
- `src/lib/scheduleDb.test.ts`: persistence shape tests for load/save/snapshot with membership.
- `src/store/scheduleStore.ts`: store master-compatible people and project membership; keep assigned people visible even when inactive.
- `src/store/scheduleStore.people.test.ts`: store-level tests for active/inactive people and task assignments.
- `src/components/schedule/PeopleModal.tsx`: convert current project-only modal into project team manager with directory-backed add/archive/deselect flows.
- `src/components/schedule/PeopleModal.safety.test.tsx`: update delete/deselect safety tests.
- `src/components/schedule/TaskDetailPanel.tsx`: assignment dropdown uses active project people; existing assigned inactive people still render with a warning.
- `src/components/schedule/ScheduleTable.tsx`: same assignment filtering for inline table assignment.
- `src/pages/Index.tsx`: add upgrade warning/status flow and pass project context to People modal.
- `src/App.tsx`: add main dashboard People management section and new-project people selection.
- `src/App.css`: People directory/project team styling polish.
- `docs/releases/1.2.2-release-notes.md`: document migration safety and restore behavior.
- `docs/releases/changelog.md`: add 1.2.2 completion entry.

## Task 1: People Model and Pure Helpers

**Files:**
- Modify: `src/types/scheduling.ts`
- Create: `src/lib/peopleDirectory.ts`
- Create: `src/lib/peopleDirectory.test.ts`

- [ ] **Step 1: Write failing helper tests**
  - Test exact-name legacy migration creates master people and active project memberships.
  - Test repeated migration is idempotent.
  - Test inactive project people are excluded from new assignment options but still resolve by ID for existing task assignments.
  - Test active-task removal guard returns assigned active tasks and completed historical tasks separately.

- [ ] **Step 2: Run red tests**
  - Run: `npm run test -- src/lib/peopleDirectory.test.ts`
  - Expected: FAIL because `peopleDirectory.ts` does not exist.

- [ ] **Step 3: Implement minimal types/helpers**
  - Add `Person.kind`, `archived`, `masterPersonId`, and fallback-compatible optional fields.
  - Add `ProjectPersonMembership` with `personId`, `projectId`, `active`, `roleOverride?`.
  - Implement helpers for migration planning, idempotent apply, assignment labels, active options, and removal analysis.

- [ ] **Step 4: Run green tests**
  - Run: `npm run test -- src/lib/peopleDirectory.test.ts`
  - Expected: PASS.

## Task 2: Store Behavior

**Files:**
- Modify: `src/store/scheduleStore.ts`
- Create: `src/store/scheduleStore.people.test.ts`

- [ ] **Step 1: Write failing store tests**
  - Loading legacy schedules initializes all legacy people as active memberships.
  - Deselecting a project person keeps completed task assignments intact.
  - Assignment option helper excludes inactive/archived people.

- [ ] **Step 2: Run red tests**
  - Run: `npm run test -- src/store/scheduleStore.people.test.ts`

- [ ] **Step 3: Implement minimal store state/actions**
  - Add `projectPeople` membership state.
  - Add actions: `setProjectPeople`, `activateProjectPerson`, `deactivateProjectPerson`, `archivePerson`, `getAssignablePeople`.
  - Replace destructive `removePerson` assignment stripping with archive/deactivate behavior.

- [ ] **Step 4: Run green tests**
  - Run: `npm run test -- src/store/scheduleStore.people.test.ts`

## Task 3: Persistence, Snapshots, and Legacy Safety

**Files:**
- Modify: `src/lib/scheduleDb.ts`
- Modify: `src-tauri/src/main.rs`
- Create/modify: schedule persistence tests as practical

- [ ] **Step 1: Write failing persistence tests**
  - Save/load project schedule preserves people plus project membership.
  - Snapshot payload includes project people state.
  - Loading old schedules without membership remains valid.

- [ ] **Step 2: Run red tests**
  - Run: focused schedule persistence tests.

- [ ] **Step 3: Implement persistence**
  - Add `project_people_json` optional SQLite column.
  - Add browser fallback field.
  - Extend Tauri records/commands.
  - Keep default `[]` for old databases and snapshots.

- [ ] **Step 4: Run green tests**
  - Run focused persistence tests.

## Task 4: Migration UX and Project Health Warning

**Files:**
- Modify: `src/pages/Index.tsx`
- Create: `src/components/schedule/PeopleUpgradeDialog.tsx`
- Test: component test if practical

- [ ] **Step 1: Write failing tests**
  - Legacy project people trigger upgrade available copy/action.
  - Approving upgrade creates master/membership data once.
  - `Not Now` defers without changing people or assignments.

- [ ] **Step 2: Implement warning/dialog**
  - Add health/status warning with `Review People Upgrade`.
  - Dialog previews create/match/activate counts.
  - Copy recommends saving a snapshot before approving.
  - Approval is idempotent.

## Task 5: People UI and Project Team Management

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/schedule/PeopleModal.tsx`
- Modify: `src/App.css`
- Modify tests: `src/components/schedule/PeopleModal.safety.test.tsx`

- [ ] **Step 1: Write failing UI tests**
  - Dashboard exposes a master People section.
  - Project People modal can add from master, create new master+project person, and deselect from future assignment.
  - Deselect warning appears for active assigned tasks.

- [ ] **Step 2: Implement UI**
  - Add dashboard master People management surface.
  - Update project People modal with active/inactive project membership.
  - Replace delete copy with archive/deselect copy.
  - Add styled empty states and compact cards.

## Task 6: Assignment Dropdowns

**Files:**
- Modify: `src/components/schedule/TaskDetailPanel.tsx`
- Modify: `src/components/schedule/ScheduleTable.tsx`
- Test: `src/components/schedule/TaskDetailPanel.safety.test.tsx`, `src/components/schedule/ScheduleTable.dnd.test.tsx` or new focused tests

- [ ] **Step 1: Write failing tests**
  - Inactive people already assigned render in task profile/table.
  - Inactive people do not appear in Add assignee dropdown.
  - Archived people remain readable on historical assignments.

- [ ] **Step 2: Implement dropdown filtering**
  - Use helper to compute active assignable people.
  - Add inactive warning text for active tasks where needed.

## Task 7: New Project People Selection

**Files:**
- Modify: `src/App.tsx`
- Test: dashboard/new project test if practical

- [ ] **Step 1: Write failing tests**
  - New project can select active people from master directory.
  - New person created during project setup is added to master and selected for project.

- [ ] **Step 2: Implement new project selection**
  - Add checkbox section to New Project modal.
  - Save selected membership with initial schedule.

## Task 8: Release Docs and Verification

**Files:**
- Create: `docs/releases/1.2.2-release-notes.md`
- Modify: `docs/releases/changelog.md`
- Modify: `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/tauri.test.conf.json`, `src-tauri/Cargo.toml`

- [ ] **Step 1: Bump version to 1.2.2**
  - Run: `npm version 1.2.2 --no-git-tag-version`
  - Run: `npm run release:version:sync`

- [ ] **Step 2: Final verification**
  - Run: `npm run test`
  - Run: `npm run build`

- [ ] **Step 3: Test release artifact**
  - Run: `npm run release:alpha:test`
  - Run: `npm run release:manifest:test:github -- --notes "Test release 1.2.2 - People directory upgrade"`

