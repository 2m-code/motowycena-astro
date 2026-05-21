param(
  [string]$Url = "https://www.motowycena.pl",
  [int]$Runs = 3,
  [ValidateSet("mobile-slow4g", "mobile-fast4g", "desktop-cable", "no-throttle")]
  [string]$Profile = "mobile-slow4g",
  [switch]$Budget,
  [switch]$Open
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

$auditArgs = @(
  "run", "audit", "--",
  "--url", $Url,
  "--runs", "$Runs",
  "--profile", $Profile,
  "--out", "reports",
  "--format", "all",
  "--screenshot"
)

if ($Budget) {
  $auditArgs += @("--budget", "budgets.example.json", "--fail-on-budget")
}

Write-Host ""
Write-Host "Mierze strone: $Url"
Write-Host "Profil: $Profile, runy: $Runs"
Write-Host ""

npm @auditArgs
$exitCode = $LASTEXITCODE

$latestReport = Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot "reports") -Recurse -Filter "*.html" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if ($latestReport) {
  Write-Host ""
  Write-Host "Najnowszy raport HTML:"
  Write-Host $latestReport.FullName

  if ($Open) {
    Invoke-Item -LiteralPath $latestReport.FullName
  }
}

exit $exitCode
