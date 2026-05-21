$ErrorActionPreference = "Stop"

$connections = Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue
if (-not $connections) {
  Write-Host "Serwer nie slucha na porcie 8787."
  exit 0
}

foreach ($conn in $connections) {
  $processId = $conn.OwningProcess
  $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($proc) {
    Write-Host "Zatrzymuje $($proc.ProcessName) pid=$processId na porcie 8787"
    Stop-Process -Id $processId -Force
  }
}
