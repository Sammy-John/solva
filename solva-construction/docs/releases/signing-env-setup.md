# Signing Env Setup (One-Time)

This prevents missing `.sig` issues during `release:alpha` and `release:alpha:test`.

## Why this failed repeatedly

- Env vars set in one PowerShell session do not always exist in the next session.
- Build scripts previously expected signing env to already be loaded.

## New behavior (already implemented)

Release scripts now run `scripts/release/load-signing-env.ps1` first.

It will:
- load `.env.release.local` then `.env.local` (if present)
- load key file from `TAURI_SIGNING_PRIVATE_KEY_PATH`
- prompt securely for password if missing (non-CI only)

## One-time setup

1. Copy `.env.release.local.example` to `.env.release.local`
2. Set `TAURI_SIGNING_PRIVATE_KEY_PATH` to your real private key path
3. Optional: add `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if you do not want prompts

## Daily release commands

- `npm run release:alpha:test`
- `npm run release:alpha`

If password is not in env file, you will be prompted once per run.
