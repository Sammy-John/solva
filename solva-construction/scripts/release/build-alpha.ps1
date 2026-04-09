#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $root

Write-Host '[release:alpha] Starting alpha release build...'

if (-not $env:TAURI_SIGNING_PRIVATE_KEY -and -not $env:TAURI_SIGNING_PRIVATE_KEY_PATH) {
  throw 'Missing signer env vars. Set TAURI_SIGNING_PRIVATE_KEY (or TAURI_SIGNING_PRIVATE_KEY_PATH) before running release:alpha.'
}

if (-not $env:TAURI_SIGNING_PRIVATE_KEY -and $env:TAURI_SIGNING_PRIVATE_KEY_PATH) {
  if (-not (Test-Path -LiteralPath $env:TAURI_SIGNING_PRIVATE_KEY_PATH)) {
    throw "Signing key path not found: $($env:TAURI_SIGNING_PRIVATE_KEY_PATH)"
  }
  # Tauri expects key content in TAURI_SIGNING_PRIVATE_KEY for updater signatures.
  $env:TAURI_SIGNING_PRIVATE_KEY = Get-Content -LiteralPath $env:TAURI_SIGNING_PRIVATE_KEY_PATH -Raw
}

npm run release:version:check
npm run test
npm run build
npm run tauri build

$packageJson = Get-Content 'package.json' -Raw | ConvertFrom-Json
$version = $packageJson.version
$artifactDir = Join-Path $root ("artifacts/{0}" -f $version)
$bundleDir = Join-Path $root 'src-tauri\target\release\bundle\nsis'

New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null

# Only copy artifacts for the version we just built. Avoid dragging older installers along.
$pattern = "*_{0}_*setup.exe*" -f $version
$matches = Get-ChildItem -LiteralPath $bundleDir | Where-Object {
  $_.Name -like $pattern -and $_.Name -notlike '*Test*'
}

if ($matches.Count -eq 0) {
  throw "No NSIS artifacts found for version $version in $bundleDir (pattern: $pattern)"
}

# Updater requires a signature file alongside the installer.
$sigMatches = $matches | Where-Object { $_.Name -like '*.exe.sig' }
if ($sigMatches.Count -eq 0) {
  throw "Updater signature (.sig) was not generated for $version. Ensure TAURI_SIGNING_PRIVATE_KEY(_PATH) is correct and TAURI_SIGNING_PRIVATE_KEY_PASSWORD is set to the correct password for the key."
}

foreach ($file in $matches) {
  Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $artifactDir $file.Name) -Force
}

Write-Host ("[release:alpha] Artifacts copied to: {0}" -f $artifactDir)
Write-Host '[release:alpha] Done.'