# Updater Configuration (Task 2)

This app uses the Tauri v2 updater plugin.

## Files wired

- `src-tauri/Cargo.toml`
  - Adds `tauri-plugin-updater = "2"` for desktop targets.
- `src-tauri/src/main.rs`
  - Registers plugin: `tauri_plugin_updater::Builder::new().build()`.
- `src-tauri/tauri.conf.json`
  - Enables updater artifacts in bundle config.
  - Adds updater endpoint and public key config.

## Required configuration before real releases

1. Replace `plugins.updater.pubkey` in `src-tauri/tauri.conf.json`.
2. Replace `plugins.updater.endpoints` with your real hosted update manifest URL.
3. Provide signing private key only via environment variables in build environment.

## Suggested key management

- Generate updater keypair once on a secure maintainer machine.
- Store private key outside the repo (password manager/secret vault/CI secrets).
- Commit only public key value in `tauri.conf.json`.

## Recommended env vars for signing

Set in shell or CI (never commit private key):

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

## Endpoint layout examples

- `https://updates.solva.app/latest.json`
- `https://github.com/<org>/<repo>/releases/latest/download/latest.json`

## Notes

- `bundle.createUpdaterArtifacts` is enabled so build can emit updater metadata/artifacts.
- If build fails during updater signing, verify both signing env vars are present and valid.
