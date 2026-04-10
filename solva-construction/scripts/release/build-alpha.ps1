#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $root

Write-Host '[release:alpha] Starting alpha release build...'

& (Join-Path $PSScriptRoot 'load-signing-env.ps1')

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
  throw "Updater signature (.sig) was not generated for $version. Ensure signing key path/password are correct."
}

foreach ($file in $matches) {
  Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $artifactDir $file.Name) -Force
}

Write-Host ("[release:alpha] Artifacts copied to: {0}" -f $artifactDir)
Write-Host '[release:alpha] Done.'
