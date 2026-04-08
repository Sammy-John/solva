# Block3+4 Date-Critical Tasks (Combined) Implementation Plan

> **For agentic workers:** Execute this as one combined stream because Inspection and Ordering/Delivery share the same scheduling risk profile.

**Goal:** Treat `Inspection`, `Ordering`, and `Delivery` as one date-critical group so urgency, missing-date warnings, and overdue risk are consistent.

**Why Combined:** The client workflow is the same for all three task types (set dates, track blockers, react to slippage). Splitting Block3 and Block4 duplicates logic and increases user confusion.

## Scope (Phase 1)

- Include `Inspection` in date-critical helper logic.
- Reuse existing urgency signal surfaces (table highlights/tooltips and critical section counts).
- Keep existing UI layout; no redesign in this phase.
- Add tests proving Inspection parity in missing-date, overdue, and urgency messaging.

## Files

- Modify: `src/lib/scheduling.ts`
- Modify: `src/lib/scheduling.test.ts`
- Modify: `docs/releases/changelog.md`
- Create: `docs/superpowers/plans/2026-04-09-block3-4-date-critical-tasks.md`

## Checklist

- [x] Add Inspection to date-critical task classification.
- [x] Keep Ordering-specific urgency thresholds while applying shared Delivery/Inspection thresholds.
- [x] Update tooltip labeling so Inspection messages read correctly.
- [x] Add focused parity tests for missing dates, overdue state, and urgency tooltip behavior.
- [x] Run focused scheduling tests.
- [ ] Run full verification (`npm run test`, `npm run build`).

## Verification Commands

- `npm run test -- src/lib/scheduling.test.ts`
- `npm run test`
- `npm run build`

## Outcome (Expected)

- Inspection tasks now surface critical schedule risk the same way as Ordering/Delivery.
- Teams see consistent urgency behavior for all external/date-critical tasks.
- No UI redesign required to unlock this clarity.
