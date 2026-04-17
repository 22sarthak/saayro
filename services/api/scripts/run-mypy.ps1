$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$python = Join-Path $repoRoot ".venv\Scripts\python.exe"
$sourceRoot = Join-Path $repoRoot "src"
$cacheDir = Join-Path $env:TEMP "saayro-mypy-cache"

if (-not (Test-Path $python)) {
  throw "Could not find Python at $python"
}

& $python -m mypy $sourceRoot --cache-dir $cacheDir
