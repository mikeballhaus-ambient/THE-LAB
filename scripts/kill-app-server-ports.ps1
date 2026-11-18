# Stops THE-LAB hybrid/server app processes (NOT main backend :3000 or Vite :5173).
# Ports come from the lab DB apps table (server + hybrid); see src/scripts/kill-all-app-servers.ts

param(
  [switch] $List
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot
try {
  $tsxArgs = @('src/scripts/kill-all-app-servers.ts')
  if ($List) {
    $tsxArgs += '--list'
  }
  npx tsx @tsxArgs
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
