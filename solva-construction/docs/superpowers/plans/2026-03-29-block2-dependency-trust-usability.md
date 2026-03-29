# Block2 Dependency Trust & Usability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dependency setup possible directly from the task profile in a fast, builder-friendly flow, then improve dependency readability and cascade trust signals.

**Architecture:** Keep the current FS-first dependency model and existing `Dependency` shape (`predecessorId`, `successorId`, `lagDays`, `autoShift`, `notes`), but add a small dependency UX/service layer that translates technical terms into builder-friendly language and records why dates moved during cascades. Keep scheduling logic in `src/lib/scheduling.ts` and state mutation in `src/store/scheduleStore.ts`; improve clarity via thin view-model helpers and focused UI updates.

**Tech Stack:** React + TypeScript, Zustand store (`useScheduleStore`), existing schedule components, Vitest.

---
## Primary User Story (Explicit Priority)

This is the primary Block2 story and takes precedence over all other Block2 work.

- User clicks a task to open Task Profile.
- User can quickly add a dependency from this task to another task right there.
- User does not need to first open the deeper global dependency management flow.

### Primary Acceptance Focus

- Task Profile contains a direct, obvious quick action (for example: `Add Dependency`).
- Quick flow is minimal steps: choose other task, optional gap, save.
- Result is understandable in plain language, including what date movement may occur.
- Block2 is not considered done unless this task-profile quick flow is working.

## Current Setup Assessment (2026-03-29)

- Dependency setup entry is header-only (`Link Tasks` button in `src/components/schedule/ScheduleHeader.tsx`), not task-profile-first.
- Task-level dependency visibility exists (`src/components/schedule/TaskDetailPanel.tsx`), but setup/edit actions are not directly available from that panel.
- Dependency form terminology remains technical (`predecessor/successor`, `Rule: FS +Xd`, `Auto-shift`) in `src/components/schedule/LinkTasksModal.tsx` and `src/components/schedule/DependencyChainModal.tsx`.
- Cascade notification is short and opaque (`Cascade: X -> N tasks affected.` in `src/store/scheduleStore.ts` + `src/components/schedule/CascadeNotification.tsx`), with no explicit “what changed and why” summary.
- Conflict visibility is present (warning icon + “Schedule conflict — dependency violated” in `src/components/schedule/ScheduleTable.tsx`) but not strongly explanatory.
- Core cascade/validation engine is solid and constrained in `src/lib/scheduling.ts` (cycle checks, lag handling, auto-shift traversal), so Block2 should focus on trust/clarity improvements around this core, not model expansion.

## File Structure Plan

- Modify: `src/pages/Index.tsx`
- Modify: `src/components/schedule/TaskDetailPanel.tsx`
- Modify: `src/components/schedule/LinkTasksModal.tsx`
- Modify: `src/components/schedule/DependencyChainModal.tsx`
- Modify: `src/components/schedule/CascadeNotification.tsx`
- Modify: `src/components/schedule/ScheduleTable.tsx`
- Modify: `src/store/scheduleStore.ts`
- Modify: `src/lib/scheduling.ts`
- Create: `src/lib/dependencyUx.ts`
- Create: `src/lib/dependencyUx.test.ts`
- Modify: `src/lib/scheduling.test.ts`
- Modify: `docs/releases/changelog.md`
- Modify: `docs/superpowers/plans/2026-03-29-block2-dependency-trust-usability.md` (checklist progress updates during execution)

### Task 1: Add Builder-Friendly Dependency Language Layer

**Files:**
- Create: `src/lib/dependencyUx.ts`
- Create: `src/lib/dependencyUx.test.ts`
- Modify: `src/components/schedule/LinkTasksModal.tsx`
- Modify: `src/components/schedule/DependencyChainModal.tsx`

- [x] **Step 1: Write failing tests for dependency UX wording helpers**
- [x] **Step 2: Run test to verify failure**
Run: `npm run test -- src/lib/dependencyUx.test.ts`
Expected: FAIL (new helper module not implemented)
- [x] **Step 3: Implement minimal helper module**
Include mapping utilities such as:
- “Task that must finish first” (instead of predecessor)
- “Task that starts after” (instead of successor)
- “Gap after first task” (instead of lag)
- FS rule rendered as plain sentence
- [x] **Step 4: Replace technical labels in dependency views**
Update `LinkTasksModal` and `DependencyChainModal` label copy to use helper outputs while preserving current functionality.
- [x] **Step 5: Verify tests pass**
Run: `npm run test -- src/lib/dependencyUx.test.ts`
Expected: PASS
- [x] **Step 6: Commit**

### Task 2: Make Dependency Setup Reachable From Task Profile

**Files:**
- Modify: `src/pages/Index.tsx`
- Modify: `src/components/schedule/TaskDetailPanel.tsx`
- Modify: `src/components/schedule/LinkTasksModal.tsx`

- [x] **Step 1: Add failing UI behavior test or manual-check script note**
Document expected flow in code comments/test note:
- open task detail
- click dependency setup action
- link modal opens with selected task context prefilled
- [x] **Step 2: Add task-level entry action in TaskDetailPanel**
Add a clear action button (“Edit Dependency Links”) in dependency chain section.
- [x] **Step 3: Thread modal-open intent through Index state**
Extend modal open state and selected task context wiring in `Index.tsx`.
- [x] **Step 4: Support optional prefill in LinkTasksModal**
Allow incoming task context to preselect predecessor/successor candidate and focus setup form.
- [x] **Step 5: Verify behavior manually and with build**
Run: `npm run build`
Expected: PASS and task-level dependency setup flow works.
- [x] **Step 6: Commit**

### Task 3: Improve Cascade Explainability (“What changed and why”)

**Files:**
- Modify: `src/lib/scheduling.ts`
- Modify: `src/store/scheduleStore.ts`
- Modify: `src/components/schedule/CascadeNotification.tsx`
- Modify: `src/lib/scheduling.test.ts`

- [x] **Step 1: Add failing tests for cascade reason output**
Add tests asserting cascade output includes per-task movement reasons (from date -> to date, constrained by which upstream task/dependency).
- [x] **Step 2: Run scheduling tests and confirm fail**
Run: `npm run test -- src/lib/scheduling.test.ts`
Expected: FAIL for missing reason metadata.
- [x] **Step 3: Extend cascade result shape minimally**
In `cascadeDependencies`, add a bounded movement summary payload without changing dependency model.
- [x] **Step 4: Show friendly cascade summary in store + toast**
Update store notification payload and `CascadeNotification` copy to include concise why/what changed details.
- [x] **Step 5: Re-run tests and build**
Run:
- `npm run test -- src/lib/scheduling.test.ts`
- `npm run build`
Expected: PASS
- [ ] **Step 6: Commit**

### Task 4: Strengthen Dependency Conflict Visibility In Table + Task Detail

**Files:**
- Modify: `src/components/schedule/ScheduleTable.tsx`
- Modify: `src/components/schedule/TaskDetailPanel.tsx`
- Modify: `src/lib/scheduling.ts`

- [ ] **Step 1: Define conflict explanation helper output**
Add helper to produce specific reason text for invalid dependency (earliest allowed date vs actual).
- [ ] **Step 2: Surface specific conflict text in tooltip/panel**
Replace generic conflict copy with explicit explanation and suggested action.
- [ ] **Step 3: Ensure no regression in warning logic**
Keep `getInvalidDependencies` as source-of-truth; only improve display detail.
- [ ] **Step 4: Verify with manual scenario checks**
Manual checks:
- manual successor before allowed date with auto-shift OFF
- warning appears with clear reason
- [ ] **Step 5: Run build**
Run: `npm run build`
Expected: PASS
- [ ] **Step 6: Commit**

### Task 5: Consistency/Trust Guardrails For Date Movement

**Files:**
- Modify: `src/store/scheduleStore.ts`
- Modify: `src/lib/scheduling.ts`
- Modify: `src/lib/scheduling.test.ts`

- [ ] **Step 1: Add failing tests for stable cascade behavior**
Cover:
- multi-predecessor latest constraint wins
- no duplicate re-shift loops
- unchanged tasks remain unchanged
- [ ] **Step 2: Run tests to confirm fail**
Run: `npm run test -- src/lib/scheduling.test.ts`
Expected: FAIL for new trust assertions.
- [ ] **Step 3: Implement minimal normalization safeguards**
Keep existing logic, add only guardrails needed for deterministic movement summaries and consistent updates.
- [ ] **Step 4: Re-run tests**
Run: `npm run test -- src/lib/scheduling.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**

### Task 6: Block2 Acceptance + Documentation Updates

**Files:**
- Modify: `docs/releases/changelog.md`
- Modify: `docs/superpowers/plans/2026-03-29-block2-dependency-trust-usability.md`
- Create: `docs/releases/block2-dependency-smoke-test.md`

- [ ] **Step 1: Add Block2 smoke checklist doc**
Include scenarios for setup reachability, dependency readability, and cascade explainability.
- [ ] **Step 2: Record implementation outcomes in changelog**
Capture versions, commands run, pass/fail notes.
- [ ] **Step 3: Mark plan checklist items complete as executed**
- [ ] **Step 4: Final verification run**
Run:
- `npm run test`
- `npm run build`
Expected: PASS
- [ ] **Step 5: Commit**

## Scope Guardrails For Block2

- Keep FS dependency type only (no CPM expansion).
- Keep existing dependency data shape unless a minimal field is required for cascade explainability.
- Do not add calendar engine complexity or critical path/float logic.
- Optimize wording and workflow for builder comprehension over feature breadth.

## Verification Commands (Execution Phase)

- `npm run test -- src/lib/dependencyUx.test.ts`
- `npm run test -- src/lib/scheduling.test.ts`
- `npm run test`
- `npm run build`

## Expected Block2 Outcome

- Dependency setup is reachable directly from task profile flow.
- Dependency terminology is easier for non-technical builders.
- Users can clearly see what moved, and why, after cascades.
- Date movement behavior feels consistent and trustworthy without widening model scope.





