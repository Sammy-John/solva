# Block2 Dependency Smoke Test

Date: 2026-03-29
Branch: feature/block2-dependency-trust

## Scope

Validate Block2 outcomes for:
- task-profile-first dependency setup
- plain-language dependency readability
- cascade explainability and trust
- clear conflict messaging for manual links

## Preconditions

- App runs in desktop mode (`npm run tauri dev`) with SQLite active.
- Project has at least 4 tasks so dependency chains can be tested.

## Checklist

- [ ] Open a task profile and confirm dependencies are editable directly in Task Profile.
- [ ] Add dependency inline from Task Profile (Depends on + Gap days + Move toggle).
- [ ] Confirm new dependency row appears immediately in "This task depends on".
- [ ] Edit the dependency from Task Profile and confirm values update.
- [ ] Remove the dependency from Task Profile and confirm it disappears.
- [ ] Confirm Advanced button still opens full link manager.
- [ ] Create auto-move chain (A -> B -> C), move A later, confirm cascade notification explains what moved and why.
- [ ] Confirm cascade notification lists task-level movement details (`from -> to` + reason task).
- [ ] Create manual (auto-move OFF) conflict and confirm table warning tooltip is explicit and non-technical.
- [ ] Open conflicted task profile and confirm conflict explanation text appears with suggested action.
- [ ] Confirm unaffected tasks remain unchanged after cascade.
- [ ] Confirm deterministic behavior by repeating same edit and seeing stable affected-task ordering in cascade message.

## CLI Verification

- [ ] `npm run test`
- [ ] `npm run build`

## Result

- Pass/Fail:
- Notes:
