# Data Preservation Runbook

This runbook covers backup and restore flow for update safety.

## Data folder and database

- App data folder: shown in the app Storage Diagnostics panel (`Open Data Folder`).
- Main DB file: `construction-planner.db`

## Backup behavior (pre-install)

When installing an update from the app:

1. App verifies SQLite health (`init_database`).
2. App verifies projects query works (`list_projects`).
3. If "Create DB backup before installing update" is enabled (default), app creates a timestamped DB copy before update install.

If any check fails, update install is blocked and an error message is shown.

## Backup file naming

Backup files are created in the same app data folder using:

- `construction-planner-backup-YYYYMMDD-HHMMSS.db`

## Manual restore steps

1. Close the app.
2. Open app data folder.
3. Keep a copy of current `construction-planner.db` (optional safety copy).
4. Copy desired backup file and rename it to `construction-planner.db`.
5. Relaunch app and verify projects/schedules/snapshots.

## Troubleshooting

### Update blocked by storage safety checks

- Open Storage Diagnostics and confirm runtime is `tauri` and storage mode is `sqlite`.
- Confirm app can open data folder.
- If DB file is missing/corrupt, restore from latest backup.

### Backup creation fails

- Ensure app has write permission to app data directory.
- Ensure there is enough disk space.
- Retry install after permissions/disk issue is resolved.

### Signature/update errors after successful backup

- Treat separately from storage integrity.
- Retry with refreshed manifest or provide full installer fallback.
