# Patch 1.1.2 Schedule Flexibility Design

## Purpose

Patch 1.1.2 makes dependency scheduling more practical for live construction work. The app should preserve the dependency chain, show consequences clearly, and let the user move quickly when site reality changes.

The current behavior is too rigid for large linked schedules because date changes can trigger broad automatic movement. Builders need strict structure for planning, but they also need warning-first flexibility when a task can overlap, a subcontractor starts early, or the real site sequence changes.

## User Outcomes

- Users can move dates even when dependencies are violated, after seeing and confirming the warning.
- Users can tell the difference between a real delay and a task that simply needs review.
- Completed tasks remain part of the dependency chain but do not move during cascades.
- Auto-shift behavior is easier to understand and is described wherever users create or inspect dependencies.
- Opening a project briefly explains the new scheduling behavior so existing users are not surprised.

## Core Scheduling Rules

### Status lifecycle

The task statuses become:

- `Planned`
- `Booked`
- `In Progress`
- `Due for Review`
- `Completed`
- `Delayed`

`Due for Review` means the planned end date has passed, but the user has not confirmed whether the task is complete, delayed, or rescheduled. It is an attention state, not a hard schedule delay.

Automatic status updates should be conservative:

- If today is between a task's start and end date, set it to `In Progress`.
- If a task's end date has passed, set it to `Due for Review`.
- Never auto-change `Completed`.
- Never auto-change `Delayed`.
- Do not auto-change tasks without enough date information.

The existing automatic past-due behavior should stop marking tasks as `Delayed`. `Delayed` should represent a user decision or an explicit scheduling consequence, not a guess from the calendar.

### Completed tasks

Completed tasks remain in the dependency chain. They still appear in Waiting On, chain views, dependency lists, and conflict explanations.

Completed tasks are locked from automatic movement:

- Auto-shift should not move a completed predecessor or successor.
- A completed predecessor may still constrain an incomplete successor.
- If the user manually edits dates on a completed task, the app may still recalculate affected incomplete successors according to dependency rules.

This gives completed tasks the role of historical anchors without breaking the logic network.

### Dependency cascade

Dependency cascade should be push-only:

- If a predecessor moves later and a linked successor now starts too early, the successor may move later when `autoShift` is on.
- If a predecessor moves earlier, the successor should not be pulled earlier automatically.
- If a successor already has extra buffer, it should not be pulled back to the earliest possible date.
- Incomplete successors with `autoShift` off should keep their dates and show a conflict warning if the rule is violated.
- Completed successors should not be moved automatically.

### Dependency violations

The app should allow dependency-violating date changes, but it should warn and ask for confirmation before applying them.

The warning should focus on direct connected dependencies first. It should explain what the user is overriding in plain language, for example:

`This starts before "Frame inspection" is planned to finish. Keep this date and show a warning?`

After confirmation:

- Apply the user's date change.
- Keep the dependency link.
- Show the row-level conflict warning.
- Do not remove or silently disable the dependency.

This preserves schedule trust while respecting the user's knowledge of site conditions.

## Auto-Shift UX

The current `autoShift` field remains on each dependency link. It should be explained as link behavior, not task behavior.

Rename visible labels from `Auto-move following task` toward:

`Auto-shift linked task`

Use helper text:

`On: move the following task later when the first task moves later. Off: keep the link, keep the date, and show a warning if the schedule conflicts.`

Use short tags in dependency summaries:

- `Auto-shift`
- `Warning only`

The concept:

- `Auto-shift` means the successor can be pushed later by this dependency.
- `Warning only` means the dependency stays visible, but the app flags conflicts instead of moving dates.

Default behavior may remain `autoShift: true` for this patch, but the UI must make the trade-off obvious before the user saves the link.

## Project Opening Help Modal

For this patch, show a clear instructional modal when opening a project. It should help existing users understand the new behavior before they edit schedules.

The modal should include:

- `In Progress`: tasks can update automatically when their start date arrives.
- `Due for Review`: tasks past their end date need a decision; they are not automatically treated as delayed.
- `Completed`: completed tasks stay in the chain but are locked from automatic movement.
- `Auto-shift`: linked tasks can move later when predecessors move later.
- `Warning only`: links can stay visible without automatically moving dates.
- Dependency warnings: users can confirm a date change when real site conditions require an override.

The modal should have a primary close action such as `Got it`. A "do not show again" preference is optional for this patch; if omitted, the modal can appear once per project load session.

## Guide Updates

Update the existing Guide sheet with two clearer sections:

### Status Review

Explain `In Progress`, `Due for Review`, `Delayed`, and `Completed` in plain language. Emphasize that `Due for Review` asks the user to decide what happened, while `Delayed` is a deliberate schedule decision.

### Dependencies & Waiting On

Explain:

- Waiting On shows predecessor tasks.
- Auto-shift moves linked successors later when needed.
- Warning-only links stay in the chain but keep dates in place.
- Dependency warnings can be confirmed when site reality differs from the plan.
- Completed tasks stay in the chain and act as fixed anchors.

## Existing Surfaces To Update

- `src/types/scheduling.ts`: add `Due for Review` to `TaskStatus`.
- `src/lib/scheduling.ts`: replace auto-delay semantics with status review helpers; update cascade to push-only and skip completed tasks.
- `src/store/scheduleStore.ts`: normalize tasks with the new status rules and avoid auto-overwriting completed/delayed tasks.
- `src/components/schedule/ScheduleTable.tsx`: show `Due for Review`, filter by it, and keep conflict warnings visible after overrides.
- `src/components/schedule/ScheduleHealthSummary.tsx`: count `Due for Review`.
- `src/components/schedule/TaskDetailPanel.tsx`: include `Due for Review` in status controls and clarify dependency labels.
- `src/components/schedule/LinkTasksModal.tsx`: rename and explain auto-shift.
- `src/components/schedule/DependencyChainModal.tsx`: use `Auto-shift` and `Warning only` tags.
- `src/lib/dependencyUx.ts`: centralize the new labels and helper copy.
- `src/pages/Index.tsx`: replace automatic delayed updates with the new auto-status rules; add the project-opening help modal; update the Guide.

## Testing

Add or update focused tests for:

- A task starting today becomes `In Progress`.
- A task past its end date becomes `Due for Review`, not `Delayed`.
- `Completed` and `Delayed` statuses are not auto-overwritten.
- Cascade pushes successors later when `autoShift` is on.
- Cascade does not pull successors earlier when predecessors move earlier.
- Cascade does not move completed tasks.
- A dependency with `autoShift` off creates a conflict warning instead of moving the successor.
- `Due for Review` appears in filtering or summary behavior.
- Dependency UX labels describe `Auto-shift` and `Warning only`.

## Out Of Scope For Patch 1.1.2

- Planned versus actual start/end date fields.
- Baseline schedule comparison.
- Dependency strength types such as Hard, Soft, and Reference.
- A full schedule impact modal with per-link decisions.
- Multi-day partial completion tracking.
- Resource allocation or crew loading.

These are useful future directions, but patch 1.1.2 should stay focused on making current dependency scheduling less brittle and easier to understand.

## Open Decisions Before Implementation

- Whether the project-opening help modal should show once per project load session or persist a "do not show again" setting.
- Whether manual date changes should use the browser `confirm()` first, or a custom app dialog from the start.
- Whether `autoShift` should continue defaulting on for new links in this patch, or default off for warning-first behavior.
