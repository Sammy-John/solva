# Patch 1.1.2 Schedule Flexibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dependency scheduling flexible enough for live construction changes while preserving dependency structure, warning users about conflicts, and explaining auto-shift behavior clearly.

**Architecture:** Keep the existing scheduling data model and Zustand store. Add one status value, centralize status auto-review logic in `src/lib/scheduling.ts`, make cascade push-only and completed-aware, then update the existing table/detail/link/guide surfaces to show the new semantics.

**Tech Stack:** React, TypeScript, Vite, Vitest, Zustand, Radix/shadcn UI components, Tailwind classes.

---

## File Structure

- `src/types/scheduling.ts`: extend `TaskStatus` with `Due for Review`.
- `src/lib/scheduling.ts`: add status review helper; update auto-delay behavior; make dependency cascade push-only and completed-aware.
- `src/lib/scheduling.test.ts`: add regression tests for status review, push-only cascade, and completed-task cascade behavior.
- `src/store/scheduleStore.ts`: use the new status helper in normalization/update flows.
- `src/store/scheduleStore.status.test.ts`: create focused store tests for conservative auto-status behavior.
- `src/lib/dependencyUx.ts`: rename auto-move copy to auto-shift/warning-only language.
- `src/lib/dependencyUx.test.ts`: update copy expectations.
- `src/components/schedule/ScheduleTable.tsx`: support `Due for Review` status style/filter display; keep conflict warnings visible.
- `src/components/schedule/ScheduleHealthSummary.tsx`: count and display `Due for Review`.
- `src/components/schedule/TaskDetailPanel.tsx`: add `Due for Review` status option and updated dependency copy/tag usage.
- `src/components/schedule/LinkTasksModal.tsx`: update auto-shift label/helper text.
- `src/components/schedule/DependencyChainModal.tsx`: use new auto-shift/warning-only tags.
- `src/pages/Index.tsx`: replace auto-delay loop with auto-status review loop; add project-opening help dialog; update guide text.
- `src/index.css`: add status styling for `Due for Review` if status styles live there.

## Implementation Notes

- Preserve existing `Dependency.autoShift`; do not add dependency strength types in this patch.
- Keep `autoShift` defaulting to `true` unless the user explicitly asks to change the default.
- Use browser `window.confirm()` for dependency-violation confirmation only if the implementation can keep it clean and localized. If conflict detection already passively flags violations after date updates, prioritize warning visibility over building a larger custom impact modal.
- Do not alter `ScheduleTableDnd.tsx` unless type errors require it; it appears to be legacy/alternate code.
- Do not touch unrelated untracked files, including `../construction-scheduler-app-audit-planning-brief.md`.

---

### Task 1: Add Status Review Semantics In Scheduling Helpers

**Files:**
- Modify: `src/types/scheduling.ts`
- Modify: `src/lib/scheduling.ts`
- Test: `src/lib/scheduling.test.ts`

- [ ] **Step 1: Write failing status tests**

Add `getAutoStatusForDate` or equivalent tests to `src/lib/scheduling.test.ts`.

```ts
import {
  cascadeDependencies,
  createsDependencyCycle,
  getAutoStatusForDate,
  getUrgency,
  getUrgencyTooltip,
  hasMissingSupplyDates,
  isPastDue,
} from '@/lib/scheduling';

describe('getAutoStatusForDate', () => {
  it('marks a planned task in its date range as in progress', () => {
    const task = baseTask({
      startDate: '2026-05-06',
      endDate: '2026-05-08',
      status: 'Planned',
    });

    expect(getAutoStatusForDate(task, '2026-05-06')).toBe('In Progress');
  });

  it('marks a past ended task as due for review, not delayed', () => {
    const task = baseTask({
      startDate: '2026-05-01',
      endDate: '2026-05-03',
      status: 'In Progress',
    });

    expect(getAutoStatusForDate(task, '2026-05-06')).toBe('Due for Review');
  });

  it('does not overwrite completed or delayed tasks', () => {
    expect(
      getAutoStatusForDate(baseTask({ endDate: '2026-05-01', status: 'Completed' }), '2026-05-06'),
    ).toBe('Completed');
    expect(
      getAutoStatusForDate(baseTask({ endDate: '2026-05-01', status: 'Delayed' }), '2026-05-06'),
    ).toBe('Delayed');
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run: `npm run test -- src/lib/scheduling.test.ts`

Expected: FAIL because `Due for Review` and `getAutoStatusForDate` do not exist yet.

- [ ] **Step 3: Extend the status type**

Update `src/types/scheduling.ts`:

```ts
export type TaskStatus =
  | "Planned"
  | "Booked"
  | "In Progress"
  | "Due for Review"
  | "Completed"
  | "Delayed";
```

- [ ] **Step 4: Add the status helper**

Add to `src/lib/scheduling.ts` near the current auto-delay helpers:

```ts
export function getAutoStatusForDate(
  task: Pick<Task, 'startDate' | 'endDate' | 'status'>,
  today = toDateString(new Date()),
): TaskStatus {
  if (task.status === 'Completed' || task.status === 'Delayed') {
    return task.status;
  }

  if (!task.startDate || !task.endDate) {
    return task.status;
  }

  if (task.endDate < today) {
    return 'Due for Review';
  }

  if (task.startDate <= today && today <= task.endDate) {
    return 'In Progress';
  }

  return task.status;
}
```

Keep or adapt `shouldAutoDelayTask` for urgency/legacy tests, but stop using it as the app's automatic status mutation path.

- [ ] **Step 5: Run scheduling tests**

Run: `npm run test -- src/lib/scheduling.test.ts`

Expected: PASS for status helper tests; existing urgency tests should still pass.

- [ ] **Step 6: Commit**

```bash
git add src/types/scheduling.ts src/lib/scheduling.ts src/lib/scheduling.test.ts
git commit -m "feat: add schedule status review helper"
```

---

### Task 2: Make Cascade Push-Only And Completed-Aware

**Files:**
- Modify: `src/lib/scheduling.ts`
- Test: `src/lib/scheduling.test.ts`

- [ ] **Step 1: Write failing cascade tests**

Add to `describe('cascadeDependencies')` in `src/lib/scheduling.test.ts`:

```ts
it('does not pull a buffered successor earlier when predecessor moves earlier', () => {
  const tasks: Task[] = [
    baseTask({
      id: 'pred',
      name: 'Pred',
      startDate: '2026-06-01',
      endDate: '2026-06-03',
      duration: 3,
    }),
    baseTask({
      id: 'succ',
      name: 'Buffered successor',
      startDate: '2026-06-10',
      endDate: '2026-06-11',
      duration: 2,
    }),
  ];

  const deps: Dependency[] = [
    { id: 'd1', predecessorId: 'pred', successorId: 'succ', lagDays: 0, autoShift: true, notes: '' },
  ];

  const result = cascadeDependencies(tasks, deps, 'pred');
  const successor = result.updatedTasks.find((task) => task.id === 'succ');

  expect(successor?.startDate).toBe('2026-06-10');
  expect(result.affectedIds).not.toContain('succ');
});

it('does not auto-move completed successors', () => {
  const tasks: Task[] = [
    baseTask({
      id: 'pred',
      name: 'Pred',
      startDate: '2026-07-01',
      endDate: '2026-07-05',
      duration: 5,
    }),
    baseTask({
      id: 'succ',
      name: 'Completed successor',
      startDate: '2026-07-02',
      endDate: '2026-07-03',
      duration: 2,
      status: 'Completed',
    }),
  ];

  const deps: Dependency[] = [
    { id: 'd1', predecessorId: 'pred', successorId: 'succ', lagDays: 0, autoShift: true, notes: '' },
  ];

  const result = cascadeDependencies(tasks, deps, 'pred');
  const successor = result.updatedTasks.find((task) => task.id === 'succ');

  expect(successor?.startDate).toBe('2026-07-02');
  expect(result.affectedIds).not.toContain('succ');
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- src/lib/scheduling.test.ts`

Expected: at least the completed successor test fails before implementation.

- [ ] **Step 3: Update cascade logic**

In `cascadeDependencies`, before applying an auto-shift constraint, skip completed tasks:

```ts
if (constraint && current.status !== 'Completed' && current.startDate < constraint.earliestStart) {
  // existing movement logic
}
```

Keep the current strict comparison `current.startDate < constraint.earliestStart`. This is the push-only rule. Do not change it to `!==`.

- [ ] **Step 4: Ensure completed successors do not propagate movement**

When collecting successors for queueing, keep queueing incomplete successors only:

```ts
const successors = dependencies.filter((d) => {
  if (d.predecessorId !== currentId || !d.autoShift) return false;
  return taskMap.get(d.successorId)?.status !== 'Completed';
});
```

- [ ] **Step 5: Run scheduling tests**

Run: `npm run test -- src/lib/scheduling.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/scheduling.ts src/lib/scheduling.test.ts
git commit -m "fix: keep dependency cascade push only"
```

---

### Task 3: Integrate Auto-Status In The Store

**Files:**
- Modify: `src/store/scheduleStore.ts`
- Create: `src/store/scheduleStore.status.test.ts`
- Modify: `src/pages/Index.tsx`

- [ ] **Step 1: Write failing store tests**

Create `src/store/scheduleStore.status.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { useScheduleStore } from '@/store/scheduleStore';
import type { Task } from '@/types/scheduling';

const task = (overrides: Partial<Task>): Task => ({
  id: 't',
  name: 'Task',
  taskType: 'Internal',
  sectionId: 'sec-a',
  startDate: '2026-05-01',
  endDate: '2026-05-01',
  duration: 1,
  assignedTo: [],
  userGroup: 'Internal',
  status: 'Planned',
  comments: [],
  ...overrides,
});

describe('scheduleStore status normalization', () => {
  it('normalizes past ended tasks to due for review', () => {
    useScheduleStore.setState({
      excludeWeekends: true,
      sections: [],
      dependencies: [],
      people: [],
      cascadeNotification: null,
      tasks: [],
    });

    useScheduleStore.getState().setScheduleData(
      [task({ id: 'review', startDate: '2020-01-01', endDate: '2020-01-02', status: 'Planned' })],
      [],
      [],
      [],
    );

    expect(useScheduleStore.getState().tasks[0].status).toBe('Due for Review');
  });

  it('does not normalize completed tasks away from completed', () => {
    useScheduleStore.getState().setScheduleData(
      [task({ id: 'done', startDate: '2020-01-01', endDate: '2020-01-02', status: 'Completed' })],
      [],
      [],
      [],
    );

    expect(useScheduleStore.getState().tasks[0].status).toBe('Completed');
  });
});
```

- [ ] **Step 2: Run store status tests**

Run: `npm run test -- src/store/scheduleStore.status.test.ts`

Expected: FAIL because `Due for Review` normalization is not implemented yet.

- [ ] **Step 3: Replace store auto-delay normalization**

In `src/store/scheduleStore.ts`, replace `shouldAutoDelayTask` usage in `normalizeTask` with `getAutoStatusForDate`:

```ts
import {
  cascadeDependencies,
  recalcEndDate,
  recalcDuration,
  getAutoStatusForDate,
  createsDependencyCycle,
  CascadeMovementSummary,
} from "@/lib/scheduling";
```

Then:

```ts
const normalizeTask = (task: Task): Task => {
  const normalizedTask: Task = {
    ...task,
    assignedTo: normalizeAssignedTo((task as { assignedTo?: unknown }).assignedTo),
    userGroup: userGroupFromTaskType(task.taskType),
  };

  normalizedTask.status = getAutoStatusForDate(normalizedTask);

  return normalizedTask;
};
```

- [ ] **Step 4: Remove the page-level auto-delay loop**

In `src/pages/Index.tsx`, remove `shouldAutoDelayTask` import and replace the effect at lines around 152-160 with a conservative auto-status effect:

```ts
useEffect(() => {
  if (!isScheduleReady) return;

  tasks.forEach((task) => {
    const nextStatus = getAutoStatusForDate(task);
    if (nextStatus !== task.status) {
      updateTask(task.id, { status: nextStatus });
    }
  });
}, [isScheduleReady, tasks, updateTask]);
```

Import `getAutoStatusForDate` from `@/lib/scheduling`.

- [ ] **Step 5: Run focused tests**

Run: `npm run test -- src/store/scheduleStore.status.test.ts src/lib/scheduling.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/store/scheduleStore.ts src/store/scheduleStore.status.test.ts src/pages/Index.tsx
git commit -m "feat: review task status automatically"
```

---

### Task 4: Update Dependency UX Copy

**Files:**
- Modify: `src/lib/dependencyUx.ts`
- Modify: `src/lib/dependencyUx.test.ts`
- Modify: `src/components/schedule/LinkTasksModal.tsx`
- Modify: `src/components/schedule/TaskDetailPanel.tsx`
- Modify: `src/components/schedule/DependencyChainModal.tsx`

- [ ] **Step 1: Write failing dependency copy tests**

Update `src/lib/dependencyUx.test.ts`:

```ts
it('formats auto-shift summary', () => {
  expect(formatAutoMoveSummary(true)).toBe(
    'Auto-shift ON: linked task will move later when the first task moves later.',
  );
  expect(formatAutoMoveSummary(false)).toBe(
    'Warning only: link stays visible, dates stay put, and conflicts are highlighted.',
  );
});

it('formats auto-shift tags', () => {
  expect(formatAutoMoveTag(true)).toBe('Auto-shift');
  expect(formatAutoMoveTag(false)).toBe('Warning only');
});
```

- [ ] **Step 2: Run dependency UX tests**

Run: `npm run test -- src/lib/dependencyUx.test.ts`

Expected: FAIL with old copy.

- [ ] **Step 3: Update centralized copy**

Change `src/lib/dependencyUx.ts`:

```ts
export const dependencyUxLabels = {
  firstTask: 'Task that must finish first',
  followingTask: 'Task that starts after',
  gapDays: 'Gap after first task (days)',
  autoShift: 'Auto-shift linked task',
  autoShiftHelp:
    'On: move the following task later when the first task moves later. Off: keep the link, keep the date, and show a warning if the schedule conflicts.',
  links: 'Task Links',
} as const;

export const formatAutoMoveSummary = (autoShift: boolean): string =>
  autoShift
    ? 'Auto-shift ON: linked task will move later when the first task moves later.'
    : 'Warning only: link stays visible, dates stay put, and conflicts are highlighted.';

export const formatAutoMoveTag = (autoShift: boolean): string =>
  autoShift ? 'Auto-shift' : 'Warning only';
```

- [ ] **Step 4: Replace hard-coded link-modal label**

In `src/components/schedule/LinkTasksModal.tsx`, replace `Auto-move following task` with `dependencyUxLabels.autoShift`. Add helper text under the switch:

```tsx
<div className="flex flex-col gap-1">
  <div className="flex items-center gap-2">
    <Switch checked={autoShift} onCheckedChange={setAutoShift} />
    <Label className="text-xs">{dependencyUxLabels.autoShift}</Label>
  </div>
  <p className="text-[11px] leading-snug text-muted-foreground">
    {dependencyUxLabels.autoShiftHelp}
  </p>
</div>
```

- [ ] **Step 5: Update task detail dependency selector copy**

In `src/components/schedule/TaskDetailPanel.tsx`, ensure the auto-move radio/selector uses `Auto-shift` and `Warning only` wording, preferably using `formatAutoMoveTag`.

- [ ] **Step 6: Run dependency UX tests**

Run: `npm run test -- src/lib/dependencyUx.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/dependencyUx.ts src/lib/dependencyUx.test.ts src/components/schedule/LinkTasksModal.tsx src/components/schedule/TaskDetailPanel.tsx src/components/schedule/DependencyChainModal.tsx
git commit -m "copy: clarify dependency auto shift behavior"
```

---

### Task 5: Surface Due For Review In Schedule UI

**Files:**
- Modify: `src/components/schedule/ScheduleTable.tsx`
- Modify: `src/components/schedule/ScheduleHealthSummary.tsx`
- Modify: `src/components/schedule/TaskDetailPanel.tsx`
- Modify: `src/pages/Index.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Inspect current status option arrays**

Run: `rg -n "Planned|Booked|In Progress|Completed|Delayed|statusClass|filterStatus" src/components src/pages src/index.css -S`

Expected: locate every hard-coded status list.

- [ ] **Step 2: Add `Due for Review` to status maps**

Update status class maps in `ScheduleTable.tsx` and `TaskDetailPanel.tsx`:

```ts
"Due for Review": "status-review",
```

- [ ] **Step 3: Add `Due for Review` to status dropdowns**

Update status arrays in `TaskDetailPanel.tsx` and `Index.tsx` filter controls to include:

```ts
"Due for Review",
```

- [ ] **Step 4: Add status styling**

In `src/index.css`, add a review style near existing status styles:

```css
.status-review {
  border-color: hsl(var(--warning));
  background: hsl(var(--warning) / 0.12);
  color: hsl(var(--warning-foreground, var(--foreground)));
}
```

If no warning token exists, use the closest existing amber/orange token pattern already in the file.

- [ ] **Step 5: Update health summary**

In `src/components/schedule/ScheduleHealthSummary.tsx`, count tasks with `status === 'Due for Review'` and render a compact summary item labeled `Needs review`.

- [ ] **Step 6: Run typecheck/build**

Run: `npm run build`

Expected: PASS, with no missing `TaskStatus` exhaustiveness errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/schedule/ScheduleTable.tsx src/components/schedule/ScheduleHealthSummary.tsx src/components/schedule/TaskDetailPanel.tsx src/pages/Index.tsx src/index.css
git commit -m "feat: show due for review tasks"
```

---

### Task 6: Add Project Opening Help Modal And Guide Updates

**Files:**
- Modify: `src/pages/Index.tsx`

- [ ] **Step 1: Add modal state**

In `src/pages/Index.tsx`, add:

```ts
const [scheduleHelpOpen, setScheduleHelpOpen] = useState(false);
```

In the project load effect, after successful `setScheduleData`, set it open once per project load session:

```ts
setScheduleHelpOpen(true);
```

Also reset it when `projectId` changes if needed.

- [ ] **Step 2: Add the help dialog**

Add a `Dialog` near the existing Settings dialog:

```tsx
<Dialog open={scheduleHelpOpen} onOpenChange={setScheduleHelpOpen}>
  <DialogContent className="sm:max-w-[560px]">
    <DialogHeader>
      <DialogTitle>Schedule flexibility updates</DialogTitle>
    </DialogHeader>
    <div className="space-y-3 text-sm text-muted-foreground">
      <p>
        The scheduler now keeps dependency links visible while giving you more control when site dates change.
      </p>
      <div className="space-y-2">
        <p><strong className="text-foreground">In Progress</strong> appears when a task reaches its date range.</p>
        <p><strong className="text-foreground">Due for Review</strong> means the planned end date passed and needs a decision.</p>
        <p><strong className="text-foreground">Completed</strong> tasks stay in the chain but do not auto-move.</p>
        <p><strong className="text-foreground">Auto-shift</strong> moves linked tasks later when predecessors move later.</p>
        <p><strong className="text-foreground">Warning only</strong> keeps the link visible but keeps dates in place.</p>
      </div>
    </div>
    <div className="flex justify-end pt-2">
      <Button onClick={() => setScheduleHelpOpen(false)}>Got it</Button>
    </div>
  </DialogContent>
</Dialog>
```

- [ ] **Step 3: Update Guide Status Review section**

In the Guide sheet, add a `Status Review` details block:

```tsx
<details className="rounded-lg border border-solva-smart/15 bg-white p-3">
  <summary className="cursor-pointer font-semibold">Status Review</summary>
  <p className="mt-2 text-sm text-solva-smart/80">
    In Progress can appear when a task reaches its date range. Due for Review means the planned end date has passed and needs a decision. Use Delayed only when it is a real schedule delay, and Completed when the task is done.
  </p>
</details>
```

- [ ] **Step 4: Update Guide dependency section**

Replace the dependency guide paragraph with:

```tsx
Use Links to add predecessor/successor relationships. Auto-shift moves linked tasks later when needed. Warning-only links stay visible, keep dates in place, and show conflicts when the plan no longer lines up. Completed tasks stay in the chain as fixed anchors.
```

- [ ] **Step 5: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "feat: explain schedule flexibility updates"
```

---

### Task 7: Final Verification

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run focused tests**

Run: `npm run test -- src/lib/scheduling.test.ts src/lib/dependencyUx.test.ts src/store/scheduleStore.status.test.ts`

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run: `npm run test`

Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Inspect git diff**

Run: `git diff --stat`

Expected: only patch 1.1.2 scheduling, UX copy, help modal, and test files changed.

- [ ] **Step 5: Manual smoke test**

Run the app using the repo's normal dev command.

Check:

- Opening a project shows the schedule flexibility help modal.
- Status filter includes `Due for Review`.
- Past-ended incomplete tasks show `Due for Review`.
- Completed tasks remain visible in dependency chain views.
- Auto-shift copy says `Auto-shift` and `Warning only`.
- Moving a predecessor later pushes only incomplete auto-shift successors.
- Warning-only dependencies keep dates in place and show conflict indicators.

- [ ] **Step 6: Final commit if needed**

If any verification fixes were required:

```bash
git add <changed files>
git commit -m "test: verify schedule flexibility patch"
```

---

## Review Note

The writing-plans skill normally asks for a plan-document-reviewer subagent. This environment only allows subagents when the user explicitly asks for them, so this plan has not been subagent-reviewed.
