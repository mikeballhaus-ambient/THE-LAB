param(
  [string]$Destination = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $Destination) {
  $stamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
  $Destination = Join-Path $repoRoot "backups\lab-data-$stamp"
}

New-Item -ItemType Directory -Force -Path $Destination | Out-Null

function Copy-IfExists {
  param([string]$Source, [string]$TargetDir)
  if (Test-Path $Source) {
    $leaf = Split-Path $Source -Leaf
    Copy-Item -Path $Source -Destination (Join-Path $TargetDir $leaf) -Force -Recurse:$false
  }
}

Write-Host "Backing up THE-LAB data to $Destination"

# Main DB
Copy-IfExists (Join-Path $repoRoot "db\the_lab.db") $Destination
Copy-IfExists (Join-Path $repoRoot "db\the_lab.db-wal") $Destination
Copy-IfExists (Join-Path $repoRoot "db\the_lab.db-shm") $Destination

# App DBs
$appDbRoot = Join-Path $repoRoot "src\apps"
Get-ChildItem -Path $appDbRoot -Directory -ErrorAction SilentlyContinue | ForEach-Object {
  $dbDir = Join-Path $_.FullName "db"
  if (Test-Path $dbDir) {
    $rel = $_.Name
    $target = Join-Path $Destination "apps\$rel\db"
    New-Item -ItemType Directory -Force -Path $target | Out-Null
    Get-ChildItem -Path $dbDir -Filter "the_lab.db*" | ForEach-Object {
      Copy-Item $_.FullName -Destination $target -Force
    }
  }
}

# Chroma
$chroma = Join-Path $repoRoot "chroma-data"
if (Test-Path $chroma) {
  $chromaTarget = Join-Path $Destination "chroma-data"
  Copy-Item -Path $chroma -Destination $chromaTarget -Recurse -Force
}

$manifest = @{
  createdAt = (Get-Date).ToUniversalTime().ToString("o")
  repoRoot = $repoRoot
  destination = $Destination
} | ConvertTo-Json

Set-Content -Path (Join-Path $Destination "manifest.json") -Value $manifest -Encoding UTF8
Write-Host "Backup complete."
