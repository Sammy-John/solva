#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $root

Write-Host '[release:alpha:test] Starting isolated test-channel build...'

& (Join-Path $PSScriptRoot 'load-signing-env.ps1')

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
  throw "Updater signature (.sig) was not generated for test build $version. Ensure signing key path/password are correct."
}

New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
foreach ($file in $matches) {
  Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $artifactDir $file.Name) -Force
}

Write-Host ("[release:alpha:test] Artifacts copied to: {0}" -f $artifactDir)
Write-Host '[release:alpha:test] Done.'
