#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $root

Write-Host '[release:alpha] Starting alpha release build...'

if (-not $env:TAURI_SIGNING_PRIVATE_KEY -and -not $env:TAURI_SIGNING_PRIVATE_KEY_PATH) {
  throw 'Missing signer env vars. Set TAURI_SIGNING_PRIVATE_KEY (or TAURI_SIGNING_PRIVATE_KEY_PATH) before running release:alpha.'
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
Copy-Item -Path (Join-Path $bundleDir '*') -Destination $artifactDir -Force

Write-Host ("[release:alpha] Artifacts copied to: {0}" -f $artifactDir)
Write-Host '[release:alpha] Done.'
