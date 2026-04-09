#!/usr/bin/env pwsh
param(
  [switch]$NoPrompt
)

$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')

function Import-DotEnvFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  $lines = Get-Content -LiteralPath $Path
  foreach ($line in $lines) {
    if (-not $line) { continue }

    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) {
      continue
    }

    $idx = $trimmed.IndexOf('=')
    if ($idx -lt 1) {
      continue
    }

    $name = $trimmed.Substring(0, $idx).Trim()
    if (-not $name) {
      continue
    }

    if (Get-Item -Path "env:$name" -ErrorAction SilentlyContinue) {
      continue
    }

    $value = $trimmed.Substring($idx + 1).Trim()
    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    Set-Item -Path "env:$name" -Value $value
  }
}

# Load local env files first (never committed because .env.* is gitignored).
Import-DotEnvFile -Path (Join-Path $root '.env.release.local')
Import-DotEnvFile -Path (Join-Path $root '.env.local')

if (-not $env:TAURI_SIGNING_PRIVATE_KEY -and $env:TAURI_SIGNING_PRIVATE_KEY_PATH) {
  if (-not (Test-Path -LiteralPath $env:TAURI_SIGNING_PRIVATE_KEY_PATH)) {
    throw "Signing key path not found: $($env:TAURI_SIGNING_PRIVATE_KEY_PATH)"
  }

  $env:TAURI_SIGNING_PRIVATE_KEY = Get-Content -LiteralPath $env:TAURI_SIGNING_PRIVATE_KEY_PATH -Raw
}

if (-not $env:TAURI_SIGNING_PRIVATE_KEY) {
  throw 'Missing signer key. Set TAURI_SIGNING_PRIVATE_KEY_PATH (recommended) or TAURI_SIGNING_PRIVATE_KEY in environment/.env.local.'
}

if (-not $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
  $isCi = ($env:CI -eq 'true' -or $env:CI -eq '1')
  if ($NoPrompt -or $isCi) {
    throw 'Missing TAURI_SIGNING_PRIVATE_KEY_PASSWORD. Set it in environment or .env.local.'
  }

  Write-Host '[release] Signing password not found in env; prompting securely...'
  $secure = Read-Host -Prompt 'Enter updater key password' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }

  if (-not $plain) {
    throw 'Signing password was empty; aborting.'
  }

  $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $plain
}

Write-Host '[release] Signing env ready.'
