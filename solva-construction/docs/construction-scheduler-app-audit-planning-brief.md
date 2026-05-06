# Construction Scheduler App Audit & Planning Brief

## Executive Summary

The app has a credible foundation for a desktop construction scheduler: it is table-first, has projects/templates, sections, task rows, dates/durations, assignees, comments, task links, dependency cascade behavior, urgency colouring, people/supplier directory data, CSV export, snapshots, and Tauri/SQLite persistence.

It is not yet public-release polished. The strongest parts are the core scheduling data model and functional coverage. The weakest parts are product polish, construction-domain credibility on first run, inconsistent styling systems, unfinished controls, ambiguous dependency behavior, and data-source clarity between SQLite, browser fallback localStorage, and template storage.

## Public Readiness Verdict

**Ready for controlled/private beta**

The app is beyond throwaway prototype quality because `npm run test` passes 31 tests across 8 files, `npm run build` succeeds, and the main scheduling/persistence flows are implemented. It is not ready for public release because several visible surfaces still feel unfinished: the default Vite README remains, Settings opens to "isn't active yet", first-run blank projects have no construction starter schedule, several UI patterns are inconsistent, and there are logic risks around dependency auto-shift and milestone semantics.

## Product Fit Assessment

The app mostly aligns with the research brief in `docs/deep-research-report.md`: the core workspace is a scheduling table, task types include `Internal`, `Ordering`, `Delivery`, and `Inspection`, dependencies are FS-style links, and ordering/delivery urgency is surfaced in the date cells.

Strong fit:

- `src/components/schedule/ScheduleTable.tsx` is the correct primary surface: a dense, builder-oriented table with sections, dates, duration, assignees, status, comments, "Waiting On", and chain count.
- `src/components/schedule/LinkTasksModal.tsx` supports dependency creation/editing with predecessor, successor, lag days, auto-move, notes, preview, duplicate prevention, self-link prevention, and cycle prevention.
- `src/components/schedule/TaskDetailPanel.tsx` gives a scheduler-style drawer for editing task metadata, dates, comments, assignees, and dependencies.
- `src/components/schedule/ScheduleHealthSummary.tsx` surfaces delayed, urgent, due-soon, missing-date, and completed counts.
- `src/lib/scheduling.ts` implements urgency thresholds similar to the MVP brief: ordering red/orange/green windows, delivery/inspection windows, missing supply dates, past-due detection, and cascade logic.

Weak fit:

- Blank projects are truly blank via `getBlankTemplateSeed()` in `src/lib/templatesDb.ts`, which means the app does not immediately demonstrate a construction schedule. A public/beta build should include a starter template with real sections such as Preliminaries, Slab, Frame, Roof, Services, Linings, Fitoff, Inspections, and Handover.
- There is no explicit allocation percentage column, supplier lead time, or ordered/delivered state. That is acceptable for MVP if intentionally excluded, but procurement cues currently depend only on dates and task type.
- The app has a "Workdays only" setting, snapshots, project/template management, CSV export, and update tooling. These are useful, but they can make the MVP feel broader than the simple research target unless the main schedule workflow is made calmer and clearer.

## Visual Design & Styling Audit

The workspace has a practical construction feel in parts: compact table rows, strong header, wine/pine/blue brand colours, utility-style controls, and real imagery in the sidebar. The dashboard is more brand/marketing-like than scheduling-tool-like, and the workspace is closer to the expected product.

Issues and recommended improvements:

- **Mixed styling systems.** `src/App.css` defines custom dashboard buttons, cards, modals, alerts, storage panels, and layout styles, while most workspace UI uses Tailwind/Radix classes in TSX. This creates uneven button radii, shadows, spacing, focus states, and typography between dashboard and app screens.
- **Typography hierarchy is inconsistent.** `src/index.css` imports Lato, Oswald, Playfair Display, and Source Code Pro; `tailwind.config.ts` makes Playfair the heading font. Playfair gives the dashboard an editorial/lifestyle feel rather than a practical construction scheduling product. Use a simpler heading face or reserve Playfair for brand-only moments.
- **Table text is very small.** `ScheduleTable.tsx` uses `text-[10px]` in many row cells and `text-[11px]` headers. This creates density but hurts scanability for a desktop production tool. A builder schedule should feel compact but readable.
- **Colour semantics conflict.** Task type colours in `src/index.css` include purple-ish delivery and blue ordering tokens, while `ScheduleTable.tsx` overrides delivery with `solva-smart` and ordering with `solva-wine`. Standardize task type colours in one place.
- **Status/alert colours are generally understandable**, especially red delayed and green completed. However, urgency colours are applied to both start and end dates for supply tasks, which can make users think both dates are independently urgent rather than a single due-by rule.
- **Table header help icons are noisy.** Every column header includes a `HelpCircle`. It improves discoverability but makes the header visually busy and less like a polished scheduling grid.
- **Dashboard feels less construction-specific.** The dashboard copy is generic ("Project planning, made practical") and project cards do not show construction schedule signals such as upcoming inspections, overdue deliveries, linked tasks, or task count.
- **Inactive Settings is public-facing prototype residue.** `src/pages/Index.tsx:721` opens a Settings dialog, but line 726 says Settings is not active yet.
- **README is still Vite template text.** `README.md:1` identifies the repo as "React + TypeScript + Vite", which is a public-readiness issue.
- **Unused/prototype assets remain.** `src/assets/vite.svg` and `src/assets/react.svg` are still present. `src/components/schedule/ScheduleTableDnd.tsx` appears to be an older/alternate table implementation not imported by `Index.tsx`.

## UX Workflow Audit

Strengths:

- Creating tasks is quick from the bottom row and per-row add button in `ScheduleTable.tsx`.
- Editing dates and duration is direct in the table and more detailed in `TaskDetailPanel.tsx`.
- Dependency creation is much clearer than a raw predecessor ID column. `LinkTasksModal.tsx` uses plain labels, search, preview, lag, auto-move, edit, remove, and validation.
- The "Waiting On" column gives immediate predecessor visibility.
- Chain count plus `DependencyChainModal.tsx` gives upstream/downstream context.
- People/supplier management is lightweight and appropriate for MVP.
- Comments are available in the task drawer and previewed in the table.
- CSV export supports spreadsheet workflows builders already understand.

Gaps and fixes:

- **Task type is not editable in the table.** Users must open the detail drawer to change `Internal`, `Ordering`, `Delivery`, or `Inspection`. For a table-first product, task type should be inline-editable or at least obvious from the row.
- **"Urgent" filter only shows red items.** `ScheduleTable.tsx:142` filters only `getUrgency() === "red"`. The label should be "Critical" or the filter should include orange and red.
- **"Waiting On" is read-only and truncated.** It is useful but cannot be edited from the cell. Add an affordance to open dependency links or show a popover of predecessor/successor details.
- **Settings is dead-end UI.** Either remove it from beta/public builds or implement the actual workday/calendar/settings controls there.
- **Move mode is discoverable but unusual.** It is safer than broken drag, but the overlay in `ScheduleTable.tsx:244` may feel heavy. Add a smaller persistent mode bar or keyboard hints near the table header.
- **No confirmation on task delete.** `TaskDetailPanel.tsx` deletes immediately after the delete button is clicked. Public/beta builds should add confirmation or undo.
- **People delete has no confirmation.** `PeopleModal.tsx` removes people and also removes their task assignments through the store. Add confirmation or undo because this can quietly change many rows.
- **Snapshot restore wording is risky.** `Index.tsx:214` says loading a snapshot replaces the current schedule view; because autosave runs after state changes, it likely persists soon after. Label it as "Restore snapshot and overwrite current schedule" if that is the intended behavior.
- **Sidebar image upload is ephemeral.** `Index.tsx:409` stores an object URL in React state only. If this is decorative, keep it out of public builds; if it is a project image, persist it.

## Functional Audit

Inspected and verified:

- `npm run test`: passed, 8 test files, 31 tests.
- `npm run build`: passed, Vite production build generated `dist/`.
- Task creation paths exist in `ScheduleTable.tsx` via bottom "New Task" and per-row add.
- Task editing paths exist in `ScheduleTable.tsx` and `TaskDetailPanel.tsx`.
- Task deletion exists in `TaskDetailPanel.tsx`.
- Section add/delete/reorder exists in `scheduleStore.ts`.
- People CRUD exists in `PeopleModal.tsx` and `scheduleStore.ts`.
- Comments add/edit/delete exists in `TaskDetailPanel.tsx`.
- Dependency create/edit/delete exists in `LinkTasksModal.tsx`, `TaskDetailPanel.tsx`, and `scheduleStore.ts`.
- Dependency cycle, duplicate, and self-link validation exists in `scheduleStore.ts` and `LinkTasksModal.tsx`.
- Date recalculation exists in `src/lib/scheduling.ts`.
- SQLite project/schedule/snapshot persistence exists in `src-tauri/src/main.rs`, `src/lib/projectsDb.ts`, and `src/lib/scheduleDb.ts`.
- Browser fallback localStorage exists for projects, schedules, snapshots, and templates.

Issues and risks:

- **Auto-shift can pull tasks earlier.** The research brief recommends push-on-slip only. `cascadeDependencies()` moves a constrained task whenever `current.startDate !== constraint.earliestStart` at `src/lib/scheduling.ts:333`, so a successor scheduled later than the minimum can be pulled earlier to the earliest allowed date. That may surprise builders who intentionally left buffer.
- **Auto-shift timing is same-day by default.** `addLagDays(predecessor.endDate, 0)` returns the predecessor end date. The UI says "finish then start", but many builders expect a finish-to-start successor to start the next day unless same-day work is explicitly allowed.
- **Inspection is not enforced as a zero-duration milestone.** The research brief recommends inspections behave as milestones. Current `TaskDetailPanel.tsx` allows any duration and separate start/end dates for inspection tasks, and `recalcEndDate()` treats duration `0` as same-day rather than a special locked milestone convention.
- **Delayed status cascades only when status is manually set to Delayed.** `scheduleStore.ts:262` cascades delayed status to successors only for direct `updates.status === "Delayed"`. Auto-delayed tasks in `Index.tsx:155` call `updateTask`, so they may cascade, but date-based delayed state is also normalized in `normalizeTask()` at `scheduleStore.ts:115`, which can set status without the same explicit status-change intent.
- **Completed tasks can become delayed when normalized indirectly.** `shouldAutoDelayTask` ignores completed tasks through `isPastDue`, so completed is protected; however, once a user manually changes a delayed task back to planned while it is still past due, `normalizeTask()` can re-mark it delayed.
- **User group is derived from task type.** `scheduleStore.ts:88` forces Delivery/Ordering to Suppliers and Internal/Inspection to Internal. This simplifies MVP, but it blocks real cases like internal pickup deliveries or supplier inspections.
- **Date logic uses local current date.** `src/lib/scheduling.ts:131` and `ScheduleHealthSummary.tsx:25` compare against `new Date()`. This is fine for desktop use but can make tests/urgency views change day by day unless clock handling is controlled in tests.
- **IDs use `Date.now()` in several UI paths.** `ScheduleTable.tsx`, `LinkTasksModal.tsx`, `PeopleModal.tsx`, and `TaskDetailPanel.tsx` use timestamp IDs. Fast repeated actions can collide; use `crypto.randomUUID()` consistently.
- **No runtime validation of saved JSON.** SQLite stores JSON blobs and the frontend parses with fallback `[]`. Corrupt JSON silently appears as empty data in `scheduleDb.ts`, which risks apparent data loss.

## Data Persistence & Packaging Risks

Persistence strengths:

- Tauri SQLite storage is implemented with `projects`, `project_schedule`, and `schedule_snapshots` tables in `src-tauri/src/main.rs`.
- Foreign keys and `ON DELETE CASCADE` are enabled.
- `initDatabase()` logs and exposes storage status.
- Browser fallback storage is intentionally used outside Tauri.
- LocalStorage migration into SQLite exists and leaves localStorage untouched.
- Update install has a preflight backup option through `prepareForUpdateInstall()`.
- Tests and build pass.

Risks:

- **Templates are localStorage-only.** `src/lib/templatesDb.ts` does not use SQLite. Installed production users may reasonably expect templates to live with project data and backups.
- **Browser preview and installed app can show different data sources.** `projectsDb.ts` and `scheduleDb.ts` fallback to localStorage in browser runtime, while Tauri uses SQLite. This is technically intentional, but the UI should make it very obvious in development/beta.
- **JSON blob storage has coarse-grained writes.** `Index.tsx:162` autosaves the full schedule 250ms after every state change. This is simple and workable for MVP, but there is no revision log except manual snapshots.
- **Snapshot restore likely overwrites current schedule shortly after loading.** Because restore calls `setScheduleData()` and autosave observes `tasks/sections/dependencies/people`, restored snapshots become the current saved schedule. Make this explicit.
- **`clear_project_people` is dangerous if called.** In `src-tauri/src/main.rs:603`, the insert path uses `'[]'` for tasks, sections, dependencies, and people if no schedule row exists. It is not currently used in the UI, but it is a risky command surface.
- **Sample people stripping is surprising.** `scheduleDb.ts` removes people with specific IDs/names through `stripSamplePeople()`. This may silently remove real user data if those names/IDs exist in migrated or older projects.

## Code Quality & Maintainability Notes

- `src/pages/Index.tsx` is too large and handles app shell, filters, persistence, snapshots, export, sidebar image upload, guide, settings, and modal orchestration in one component.
- `src/components/schedule/ScheduleTable.tsx` is very large and mixes table layout, row rendering, inline editing, move mode, section rendering, urgency, dependency warnings, task creation, and affordance help.
- `src/components/schedule/ScheduleTableDnd.tsx` appears to be duplicate/legacy code. Remove or clearly retire it once the current move-mode table is stable.
- `src/App.css` contains old dashboard/workspace styles plus current dashboard styles. Several classes such as `.workspace-shell`, `.projects-panel`, and `.project-row` look legacy.
- `src/index.css` and `tailwind.config.ts` define overlapping design tokens. Consolidate task/status/urgency tokens and reduce ad hoc colour usage inside TSX.
- Tests cover scheduling, dependency UX, reordering, update tooling, and project tools, but there are no integration tests for project creation, autosave, SQLite command behavior, snapshot restore, people deletion, or template persistence.
- Rust commands are straightforward and readable, but SQLite JSON blob storage will become harder to migrate if task fields expand.

## Priority Fix Plan

### P0 - Must fix before public/beta use

- Fix dependency cascade to push successors later only, not pull intentionally buffered tasks earlier.
- Enforce inspection milestone semantics: duration `0`, start=end, clear UI indication.
- Remove or implement inactive Settings.
- Replace default README with product-specific setup, data storage, test, and release notes.
- Add confirmation/undo for task delete and people delete.
- Make snapshot restore wording explicit that it overwrites the active schedule.
- Add a default construction starter template or sample project so first-run value is obvious.
- Clarify browser fallback vs installed SQLite storage in the UI.

### P1 - Should fix for polish and usability

- Standardize visual tokens and remove duplicated/legacy styles.
- Increase table row text size slightly and reduce header help-icon clutter.
- Add inline task type editing to the main table.
- Rename "Urgent" filter to "Critical" or include orange/red.
- Make Waiting On/Chain cells open richer dependency detail directly.
- Persist templates in SQLite or at least include them in backup/export messaging.
- Replace `Date.now()` IDs with `crypto.randomUUID()`.
- Add focused tests for dependency no-pull behavior, inspection milestones, delete confirmation/undo, and snapshot restore semantics.

### P2 - Later improvements

- Add supplier lead-time defaults and per-supplier procurement thresholds.
- Add saved filters for Procurement Hotlist, Inspections, Delayed, and Supplier commitments.
- Add allocation percentage only if the target users confirm it matters for the MVP.
- Add baseline/snapshot comparison later, not as a first public requirement.
- Add a look-ahead view derived from the table.
- Consider import/export of full schedule JSON for support and recovery.

## Recommended Next Implementation Plan

1. Stabilize scheduling semantics: push-only cascade, same-day vs next-day FS decision, inspection milestone rules, tests for all three.
2. Clean beta-facing prototype residue: README, Settings, unused Vite/React assets, duplicate table component, and dead/legacy CSS.
3. Improve first-run construction credibility: ship one starter construction schedule template with real sections, ordering/delivery rows, inspection milestones, supplier/internal assignments, comments, and dependency links.
4. Tighten destructive flows: confirmation or undo for task/person/snapshot deletion and clear restore wording.
5. Polish table UX: task type inline editing, clearer urgency filter, richer dependency popover from Waiting On/Chain, better readable density.
6. Clarify persistence: storage status language, template persistence decision, data backup/export guidance, and corruption handling.
7. Add integration/regression tests for the highest-risk user workflows.

## Files/Components to Inspect or Modify

- `src/lib/scheduling.ts`: date math, urgency thresholds, dependency cascade, conflict detection.
- `src/store/scheduleStore.ts`: task normalization, user group derivation, delayed cascade, mutation APIs, delete behavior.
- `src/components/schedule/ScheduleTable.tsx`: primary table UX, inline editing, filters, Waiting On, move mode, table styling.
- `src/components/schedule/TaskDetailPanel.tsx`: task edit drawer, comments, dependencies, destructive delete, inspection behavior.
- `src/components/schedule/LinkTasksModal.tsx`: dependency creation/editing labels, preview, lag behavior, validation.
- `src/components/schedule/PeopleModal.tsx`: supplier/internal directory CRUD, deletion safety.
- `src/components/schedule/ScheduleHealthSummary.tsx`: urgency and delayed summary messaging.
- `src/pages/Index.tsx`: workspace shell, filters, autosave, snapshots, CSV export, Settings, Guide, sidebar image upload.
- `src/App.tsx`: dashboard, project/template CRUD, storage/update panels.
- `src/lib/projectsDb.ts`: SQLite initialization, localStorage migration, project fallback behavior.
- `src/lib/scheduleDb.ts`: schedule persistence, snapshots, sample-person stripping, corrupt JSON handling.
- `src/lib/templatesDb.ts`: localStorage-only templates and starter template opportunity.
- `src-tauri/src/main.rs`: SQLite schema, backup, project/schedule/snapshot commands, risky `clear_project_people`.
- `src/index.css`, `src/App.css`, `tailwind.config.ts`: design token consolidation and styling cleanup.
- `README.md`: replace Vite template text with product-specific documentation.
