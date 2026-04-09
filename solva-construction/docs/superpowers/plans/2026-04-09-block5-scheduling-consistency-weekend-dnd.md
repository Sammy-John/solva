# Block5 Scheduling Consistency + Weekend Logic

**Goal:** Make schedule editing feel consistent and non-technical by tightening inline date behavior and adding workday counting mode.

## Scope

- Keep inline date fields editable (`start`, `end`, `days`) and ensure recalculation behavior is consistent.
- Add an explicit `Workdays only` mode that excludes weekends from duration and lag counting.
- Keep weekends available in date picker (user can still choose weekend dates).
- Keep dependency conflict previews consistent with selected weekend mode.

## Files

- Modify: `src/lib/scheduling.ts`
- Modify: `src/store/scheduleStore.ts`
- Modify: `src/components/schedule/ScheduleHeader.tsx`
- Modify: `src/pages/Index.tsx`
- Modify: `src/components/schedule/ScheduleTable.tsx`
- Modify: `src/components/schedule/LinkTasksModal.tsx`
- Modify: `src/lib/scheduling.test.ts`
- Modify: `docs/releases/changelog.md`
- Create: `docs/superpowers/plans/2026-04-09-block5-scheduling-consistency-weekend-dnd.md`

## Checklist

- [x] Add weekend-aware scheduling helpers and cascade/dependency validation support.
- [x] Add global schedule mode state for weekend counting and wire it through updates/cascade.
- [x] Add header toggle (`Workdays only`) and connect it to store state.
- [x] Ensure dependency preview uses the same weekend-aware lag logic.
- [ ] Schedule task reordering UX moved to a separate follow-up block.
- [x] Fix malformed schedule table/index code and restore build-safe typing/handlers.
- [x] Run focused scheduling tests.
- [x] Run full verification (`npm run test`, `npm run build`).
- [ ] Manual UX pass on installed app for inline dates + weekend/workday mode behavior.

## Verification Commands

- `npm run test -- src/lib/scheduling.test.ts`
- `npm run test`
- `npm run build`

## Outcome

- Users can toggle between calendar-day and workday counting without changing how they pick dates.
- Dependency lag and cascade behavior follow the same counting mode.
- Task reordering UX improvements moved to a dedicated follow-up block.


