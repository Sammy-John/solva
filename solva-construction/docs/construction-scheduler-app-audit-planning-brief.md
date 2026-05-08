# Construction Scheduler App Audit & Release 1.2 Planning Brief

## Executive Summary

The app has moved past the original scheduling-prototype baseline. Patch 1.1.2 materially improved schedule trust: dependency auto-shift is now push-only, completed tasks stay in the dependency chain but are protected from automatic movement, automatic calendar status now uses `In Progress` and `Due for Review` instead of guessing `Delayed`, dependency labels explain `Auto-shift` and `Warning only`, and the workspace opens with a schedule-flexibility help modal.

The next release should therefore not spend its energy re-solving 1.1.2. Release 1.2 should convert the current private-beta scheduler into a more credible construction product by fixing public-facing residue, first-run value, destructive-action safety, milestone semantics, persistence clarity, and table polish.

## Release 1.2 Branch Progress

Implemented on `feature/patch-1.2`:

- Product-specific `README.md` now replaces the Vite template text.
- Settings is active and exposes Workdays-only scheduling plus SQLite/localStorage storage guidance.
- A built-in `Construction Starter Schedule` template ships with realistic construction sections, ordering/delivery/internal/inspection tasks, starter comments, and dependency links.
- Inspection tasks are normalized as zero-duration same-day milestones on load and edit.
- Task delete and people delete now require confirmation.
- Snapshot restore copy now states that restore overwrites the active saved schedule.
- Storage clarity is included in Settings and README.

## 1.1.2 Implementation Check

### Implemented

- `src/types/scheduling.ts` includes `Due for Review` in `TaskStatus`.
- `src/lib/scheduling.ts` includes `getConservativeStatusForDate()`, which preserves `Completed` and `Delayed`, sets active date-range tasks to `In Progress`, and sets past-ended tasks to `Due for Review`.
- `src/store/scheduleStore.ts` normalizes tasks through `getConservativeStatusForDate()` instead of relying on auto-delay semantics.
- `src/pages/Index.tsx` runs a conservative auto-status effect after schedule load.
- `src/lib/scheduling.ts` now makes cascade push-only by moving successors only when `current.startDate < constraint.earliestStart`; it no longer pulls buffered successors earlier.
- `cascadeDependencies()` skips completed successors during auto-shift.
- `src/store/scheduleStore.ts` still cascades an explicit user-set `Delayed` status to successors, which is acceptable because `Delayed` is now a user decision rather than an automatic past-due guess.
- `src/lib/dependencyUx.ts`, `src/components/schedule/LinkTasksModal.tsx`, `TaskDetailPanel.tsx`, and `DependencyChainModal.tsx` use the newer `Auto-shift` / `Warning only` language.
- `src/components/schedule/ScheduleHealthSummary.tsx`, `ScheduleTable.tsx`, `ScheduleHeader.tsx`, `TaskDetailPanel.tsx`, and `src/pages/Index.tsx` expose `Due for Review`.
- `src/pages/Index.tsx` includes the one-session "Schedule flexibility updates" modal and the Guide includes status/dependency explanations.
- Focused tests exist for scheduling/status behavior, dependency UX wording, reordering, workday calculations, update tooling, and project tools.

### Still Open After 1.1.2

- The design goal of confirming dependency-violating date changes is not fully implemented. Auto-shift links still tend to snap/block the edit through cascade and blocked-edit guidance, while warning-only links can surface conflicts.
- `README.md` is still the default Vite template.
- `src/pages/Index.tsx` still exposes a Settings dialog that says "Settings isn't active yet in this version."
- Blank projects are still truly blank through `getBlankTemplateSeed()` in `src/lib/templatesDb.ts`; there is no built-in construction starter schedule.
- Inspection tasks are visually treated as date-critical, but they are not enforced as zero-duration milestones in `TaskDetailPanel.tsx`, `ScheduleTable.tsx`, or `scheduleStore.ts`.
- Task delete and people delete still happen immediately from `TaskDetailPanel.tsx` and `PeopleModal.tsx`.
- Snapshot restore wording still says it replaces the "current schedule view" even though autosave makes it the active saved schedule shortly after restore.
- Templates remain localStorage-only while projects/schedules/snapshots use SQLite in Tauri.
- Several UI paths still use `Date.now()` IDs: sections in `scheduleStore.ts`, tasks in `ScheduleTable.tsx`, dependencies in `LinkTasksModal.tsx` and `TaskDetailPanel.tsx`, and people in `PeopleModal.tsx`.
- `ScheduleTableDnd.tsx` remains as a duplicate/legacy table implementation.
- Styling is still split across Tailwind/Radix UI, `src/index.css`, and large legacy/custom blocks in `src/App.css`.

## Public Readiness Verdict

**Ready for controlled/private beta, not public release.**

The core scheduler is credible: it is table-first, supports sections, task rows, dates/durations, assignees, comments, task links, dependency cascade behavior, urgency colouring, people/supplier directory data, CSV export, snapshots, templates, workday calculations, and Tauri/SQLite persistence. The 1.1.2 dependency/status changes removed the largest schedule-trust issue from the original audit.

The 1.2 branch now addresses the original P0 release-quality gaps around default README text, inactive Settings, empty first-run value, immediate destructive deletes, unclear snapshot restore permanence, inspection milestone enforcement, and SQLite/browser storage guidance. Remaining public-release risk is now concentrated in the P1/P2 polish items below.

## Product Fit Assessment

The app still aligns well with `docs/deep-research-report.md`: the primary workspace is a dense editable schedule table; task types include `Internal`, `Ordering`, `Delivery`, and `Inspection`; dependencies are FS-style links with lag and auto-shift behavior; ordering/delivery/inspection urgency is surfaced through RAG-style date warnings.

Strong fit:

- `src/components/schedule/ScheduleTable.tsx` remains the correct primary surface for a builder-oriented scheduler.
- `src/components/schedule/LinkTasksModal.tsx` gives dependency creation/editing enough structure without becoming full CPM.
- `src/components/schedule/TaskDetailPanel.tsx` gives a practical detail drawer for task metadata, dates, comments, assignees, and links.
- `src/lib/scheduling.ts` now matches the research recommendation for push-on-slip auto-shift, while warning-only links provide a visible conflict path.
- Workdays-only calculation is a useful beta feature even though the original MVP research suggested calendar math could wait.

Weak fit for 1.2:

- First-run value is too low. A blank schedule does not demonstrate construction-specific workflows such as preliminaries, slab, frame, roof, services, linings, fitoff, inspections, handover, ordering, and delivery links.
- Inspection is not yet a true milestone-by-convention. Release 1.2 should enforce duration `0` and `startDate === endDate` for `Inspection` tasks.
- The task model still derives `userGroup` from task type, which is simple but blocks real-world exceptions like supplier inspections or internal pickup/delivery tasks.
- Procurement visibility is date-threshold based only. That is acceptable for 1.2, but supplier lead-time metadata should remain a later feature unless users specifically ask for it.

## UX And Workflow Audit

### Strengths

- Task creation is quick from the table.
- Date, duration, status, assignment, comments, and dependency editing are available without leaving the workspace.
- `Waiting On`, chain count, dependency modals, and row-level conflict warnings make dependency behavior visible.
- 1.1.2 copy better explains that auto-shift pushes linked tasks later, while warning-only links keep dates in place and flag conflicts.
- The Guide now explains status review and dependency behavior in builder-friendly language.
- CSV export and snapshots support familiar spreadsheet and recovery workflows.

### Gaps For 1.2

- Settings is still a dead-end. Either wire the existing Workdays-only control and storage/status information into Settings, or remove the Settings entry from the release build.
- Task type is editable in the detail drawer, but not inline in the main table. For a table-first scheduler, type should be directly editable where users scan tasks.
- The "Urgent" filter only communicates "urgent" broadly. Rename it to "Critical" if it only shows red items, or expand it to include orange and red as an attention filter.
- Waiting On and Chain cells should open dependency detail directly or expose a small popover. They are useful but still too read-only.
- Move mode works, but it remains unusual. Keep the current safe move mode, but reduce overlay heaviness and make the active mode bar calmer.
- Sidebar image upload is ephemeral object-URL state. Persist it as a project image or remove the upload affordance from release builds.

## Functional And Logic Audit

Resolved by 1.1.2:

- Auto-shift no longer pulls successors earlier just because a predecessor moved earlier.
- Completed successors are no longer moved automatically by cascade.
- Past-ended tasks now become `Due for Review`, not automatically `Delayed`.
- `Completed` and `Delayed` are preserved during conservative auto-status updates.
- Dependency UX language now distinguishes `Auto-shift` from `Warning only`.

Remaining risks:

- Finish-to-start with `lagDays: 0` still permits same-day successor starts because the constraint uses predecessor end date plus zero lag. Decide whether 1.2 keeps same-day FS or changes new-link preview/default copy to make this explicit.
- Confirm-and-override for dependency-violating date edits remains incomplete. Release 1.2 should either implement a real confirmation flow or explicitly keep the current snap/block behavior and update copy accordingly.
- Inspection milestone behavior is not enforced. Users can set nonzero durations and separate start/end dates on inspection tasks.
- Explicitly setting a task to `Delayed` still cascades `Delayed` status to successors. This may be right, but 1.2 should make the UI copy clear because it is a high-impact action.
- `getConservativeStatusForDate()` uses `new Date()` by default, so day-sensitive UI and tests need controlled-date coverage around midnight/timezone-sensitive cases.
- Runtime saved JSON validation is still weak. Corrupt schedule blobs can appear as empty fallback data in places, which can feel like data loss.

## Data Persistence And Packaging Risks

Persistence strengths:

- Tauri SQLite storage exists for projects, project schedules, and schedule snapshots.
- Browser fallback localStorage remains available outside Tauri.
- LocalStorage migration into SQLite exists.
- Update install has backup/preflight support.

Release 1.2 risks:

- Templates are localStorage-only in `src/lib/templatesDb.ts`, unlike project schedules and snapshots.
- Browser preview and installed app can show different data sources. This is expected technically, but the UI/docs should say it plainly.
- Snapshot restore becomes the current saved schedule after autosave. Wording should say "Restore snapshot and overwrite current schedule."
- `clear_project_people` remains a risky backend command surface if ever wired incorrectly.
- `stripSamplePeople()` in `scheduleDb.ts` can silently remove specific sample names/IDs from older or migrated data.

## Visual Design And Styling Audit

The workspace still has the right product direction: compact table, strong construction-flavoured palette, practical controls, and real imagery. The dashboard and app shell still carry prototype/design-system inconsistencies.

1.2 polish targets:

- Replace default README and remove Vite/React starter residue.
- Consolidate styling between Tailwind/Radix, `src/index.css`, and `src/App.css`.
- Revisit typography. Playfair and broad dashboard styling still make parts of the app feel more editorial than operational.
- Increase the smallest table text where possible. Dense is good; `text-[10px]` everywhere is hard to scan.
- Standardize task-type and urgency colour semantics in one token layer.
- Reduce table header help-icon noise.
- Remove or retire `ScheduleTableDnd.tsx` once the current table is confirmed as the only supported table.

## Release 1.2 Scope Recommendation

### P0 - Implemented On `feature/patch-1.2`

- [x] Replace `README.md` with product-specific setup, storage, test, build, and release notes.
- [x] Implement the Settings dialog.
- [x] Add a built-in construction starter schedule/template with realistic sections, task types, durations, dependency links, ordering/delivery rows, inspection milestones, and starter comments.
- [x] Enforce inspection milestone semantics: duration `0`, start=end, and clear UI indication through store normalization.
- [x] Add confirmation for task delete and people delete.
- [x] Update snapshot restore copy to say it overwrites the active schedule.
- [x] Clarify installed SQLite vs browser fallback storage in UI and docs.

### P1 - Strong 1.2 Polish

- Replace remaining `Date.now()` IDs with `crypto.randomUUID()`.
- Add inline task type editing to the main table.
- Rename or broaden the Urgent filter.
- Make Waiting On/Chain cells open dependency details directly.
- Persist templates in SQLite or clearly document/export them as local browser/app preference data.
- Consolidate visual tokens and remove stale CSS/duplicate table code.
- Add regression tests for inspection milestones, delete confirmation/undo, snapshot restore wording, starter template creation, and ID generation helpers.

### P2 - Later Than 1.2

- Supplier lead-time defaults and per-supplier procurement thresholds.
- Saved views for Procurement Hotlist, Inspections, Due for Review, Delayed, and Supplier commitments.
- Look-ahead view derived from the same schedule table.
- Full JSON export/import for support and recovery.
- Baseline/snapshot comparison.
- Allocation percentage or resource loading only after user validation.

## Recommended 1.2 Implementation Order

1. Clean release residue: README, inactive Settings decision, stale assets, duplicate table decision.
2. Ship first-run credibility: starter construction schedule/template and docs describing it.
3. Lock construction semantics: inspection milestones, clearer same-day FS copy, high-impact delayed cascade copy.
4. Tighten destructive flows: task/person delete confirmation or undo, snapshot restore overwrite wording.
5. Polish table workflow: inline task type, urgency filter naming, dependency detail affordances.
6. Clarify persistence: template storage decision, storage status language, browser-vs-installed docs, corrupt JSON handling.
7. Add focused regression tests and run full verification before tagging 1.2.

## Files Most Likely To Change For 1.2

- `README.md`: replace Vite template text.
- `src/pages/Index.tsx`: Settings, Guide, snapshots, storage language, sidebar image decision, filters.
- `src/lib/templatesDb.ts`: starter template and template persistence decision.
- `src/store/scheduleStore.ts`: inspection normalization, ID helper usage, destructive-flow support, status cascade copy/rules.
- `src/lib/scheduling.ts`: any FS lag wording/math decision and date-status testability.
- `src/components/schedule/ScheduleTable.tsx`: inline task type, urgency filter behavior, Waiting On/Chain affordances, ID helper usage.
- `src/components/schedule/TaskDetailPanel.tsx`: inspection fields, task delete confirmation/undo, delayed cascade explanation.
- `src/components/schedule/PeopleModal.tsx`: delete confirmation/undo and `crypto.randomUUID()`.
- `src/components/schedule/LinkTasksModal.tsx`: same-day FS preview/copy and `crypto.randomUUID()`.
- `src/components/schedule/DependencyChainModal.tsx`: dependency detail affordance polish.
- `src/components/schedule/ScheduleHealthSummary.tsx`: summary naming if filters/status labels change.
- `src/lib/scheduleDb.ts` and `src-tauri/src/main.rs`: storage clarity, JSON validation, template SQLite support if chosen.
- `src/index.css`, `src/App.css`, `tailwind.config.ts`: visual token consolidation and stale style cleanup.
- `src/components/schedule/ScheduleTableDnd.tsx`: remove or explicitly retire.
