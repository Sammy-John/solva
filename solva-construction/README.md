# Construction Planner Desktop

Desktop-first construction scheduling app for small building teams. The core workflow is a dense schedule table with sections, task types, dates, duration, assignees, comments, dependency links, urgency signals, snapshots, CSV export, and local Tauri/SQLite persistence.

## Development

```bash
npm install
npm run dev
```

## Test And Build

```bash
npm run test
npm run build
```

## Desktop App

```bash
npm run tauri
```

Installed builds store projects, schedules, and snapshots in SQLite through Tauri commands. Browser preview uses localStorage fallback data, so preview data can differ from installed app data.

## Current Release Focus

Version `1.2` focuses on release polish: a construction starter schedule, inspection milestone semantics, active Settings, safer destructive actions, clearer snapshot restore copy, and product-specific documentation.
