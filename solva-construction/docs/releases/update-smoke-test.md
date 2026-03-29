# Update Smoke Test (vN -> vN+1)

Use this checklist for each alpha drop.

## Preconditions

- Updater endpoint is reachable.
- `latest.json` is published and points to the new installer.
- Installer and `.sig` files are published.

## Procedure

1. Install `vN` on a clean machine.
2. Launch app and create sample data:
   - 1 project
   - 1 schedule row
   - 1 snapshot
3. Publish `vN+1` artifacts and manifest.
4. In app, click **Check for Updates**.
5. Run **Install Update**.
6. Restart app.
7. Verify:
   - app version changed to `vN+1`
   - project/schedule/snapshot data still present
8. If update fails, perform rollback by reinstalling previous signed installer and verify data remains in app data dir.

## First Smoke Run Evidence

Date: 2026-03-28
Operator: Codex

### Commands run

- `npm run release:alpha`
- `npm run release:manifest -- --base-url https://updates.solva.app --notes "Alpha smoke run 1.0.0"`

### Results

- [x] Release script succeeded.
- [x] Manifest generated.
- [ ] In-app update (vN -> vN+1) executed on second machine.
- [ ] Data preservation verified after update.

### Artifacts generated

- `artifacts/1.0.0/Construction Planner Desktop_1.0.0_x64-setup.exe`
- `artifacts/1.0.0/Construction Planner Desktop_1.0.0_x64-setup.exe.sig`
- `artifacts/1.0.0/latest.json`
- `artifacts/latest.json`

### Notes

- This run verified local release packaging and updater manifest generation.
- Full end-to-end in-app update requires a separate baseline install (`vN`) and a newer build (`vN+1`) hosted at the configured endpoint.
