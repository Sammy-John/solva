#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $root

Write-Host '[release:alpha:test] Starting isolated test-channel build...'

if (-not $env:TAURI_SIGNING_PRIVATE_KEY -and -not $env:TAURI_SIGNING_PRIVATE_KEY_PATH) {
  throw 'Missing signer env vars. Set TAURI_SIGNING_PRIVATE_KEY (or TAURI_SIGNING_PRIVATE_KEY_PATH) before running release:alpha:test.'
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
npm run tauri -- build --config src-tauri/tauri.test.conf.json

$packageJson = Get-Content 'package.json' -Raw | ConvertFrom-Json
$version = $packageJson.version
$artifactDir = Join-Path $root ("artifacts/test/{0}" -f $version)
$bundleDir = Join-Path $root 'src-tauri\target\release\bundle\nsis'

$pattern = "*Desktop Test*_{0}_*setup.exe*" -f $version
$matches = Get-ChildItem -LiteralPath $bundleDir | Where-Object { $_.Name -like $pattern }
if ($matches.Count -eq 0) {
  throw "No test-channel NSIS artifacts found with pattern: $pattern"
}

# Updater requires a signature file alongside the installer.
$sigMatches = $matches | Where-Object { $_.Name -like '*.exe.sig' }
if ($sigMatches.Count -eq 0) {
  throw "Updater signature (.sig) was not generated for test build $version. Ensure TAURI_SIGNING_PRIVATE_KEY(_PATH) is correct and TAURI_SIGNING_PRIVATE_KEY_PASSWORD is set to the correct password for the key."
}

New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
foreach ($file in $matches) {
  Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $artifactDir $file.Name) -Force
}

Write-Host ("[release:alpha:test] Artifacts copied to: {0}" -f $artifactDir)
Write-Host '[release:alpha:test] Done.'