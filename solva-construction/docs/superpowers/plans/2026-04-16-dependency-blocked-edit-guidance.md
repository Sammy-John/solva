# Dependency Blocked Edit Guidance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep inline date/day editing fast while clearly explaining blocked dependency constraints and restoring earlier auto-shift cascading.

**Architecture:** Extend scheduling logic to support both forward and backward auto-shift cascades and expose a focused blocked-edit summary from the store. Render a small anchored callout in the schedule table near the edited cell with the first blocking reason and a direct jump-to-blocker action.

**Tech Stack:** React, Zustand, Vitest, TypeScript

---

### File Map

- Modify: `src/lib/scheduling.ts`
  Restore bidirectional auto-shift cascading and add helper logic for the strongest blocking dependency.
- Modify: `src/lib/scheduling.test.ts`
  Add regression coverage for moving earlier / shortening duration and helper behavior.
- Modify: `src/store/scheduleStore.ts`
  Surface blocked edit details from inline updates.
- Modify: `src/store/scheduleStore.reorder.test.ts`
  Verify store emits blocked-edit guidance and earlier cascade behavior.
- Modify: `src/components/schedule/ScheduleTable.tsx`
  Show an anchored blocked-edit callout and support jump-to-blocker selection.
- Modify: `src/components/schedule/ScheduleTable.dnd.test.tsx`
  Verify the callout appears and names the blocker.

### Task 1: Restore Bidirectional Cascade Logic
- [ ] Add a failing scheduling test for predecessor moving earlier pulling successors earlier.
- [ ] Run the targeted scheduling/store tests and confirm they fail for the expected reason.
- [ ] Update `cascadeDependencies()` so auto-shift successors align to the computed earliest valid start in both directions.
- [ ] Re-run scheduling/store tests and confirm they pass.

### Task 2: Surface Blocked Edit Guidance
- [ ] Add failing store tests for a blocked edit capturing the earliest valid date and blocker task.
- [ ] Add a scheduling helper that identifies the strongest non-auto-shift blocker for a requested edit.
- [ ] Update the store to keep a short-lived blocked edit payload after inline date/day edits are constrained.
- [ ] Re-run store tests and confirm they pass.

### Task 3: Render Anchored Callout In Table
- [ ] Add a failing component test for blocked edit callout text and blocker action.
- [ ] Render a lightweight anchored callout near the edited date/day cell with: blocked reason, earliest allowed date, and `Go to blocker`.
- [ ] Wire `Go to blocker` to select the blocking task in the existing detail panel.
- [ ] Re-run component tests and confirm they pass.

### Task 4: Verify
- [ ] Run: `npm run test -- src/lib/scheduling.test.ts src/store/scheduleStore.reorder.test.ts src/components/schedule/ScheduleTable.dnd.test.tsx`
- [ ] Run: `npm run build`
- [ ] If green, rebuild test installer on request.
