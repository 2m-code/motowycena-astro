param(
  [string]$DefaultUrl = "https://www.motowycena.pl"
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

function Normalize-Url {
  param([string]$RawUrl)

  $value = $RawUrl.Trim()
  if ($value -eq "") {
    return ""
  }
  if ($value -notmatch "^https?://") {
    return "https://$value"
  }
  return $value
}

function Ask-Text {
  param(
    [string]$Prompt,
    [string]$Default = ""
  )

  if ($Default -ne "") {
    $answer = Read-Host "$Prompt [$Default]"
    if ($answer.Trim() -eq "") {
      return $Default
    }
    return $answer
  }

  return Read-Host $Prompt
}

function Ask-Int {
  param(
    [string]$Prompt,
    [int]$Default,
    [int]$Min,
    [int]$Max
  )

  while ($true) {
    $raw = Read-Host "$Prompt [$Default]"
    if ($raw.Trim() -eq "") {
      return $Default
    }

    $value = 0
    if ([int]::TryParse($raw, [ref]$value) -and $value -ge $Min -and $value -le $Max) {
      return $value
    }

    Write-Host "Podaj liczbe od $Min do $Max."
  }
}

function Ask-YesNo {
  param(
    [string]$Prompt,
    [bool]$Default = $true
  )

  $suffix = if ($Default) { "T/n" } else { "t/N" }
  while ($true) {
    $raw = (Read-Host "$Prompt [$suffix]").Trim().ToLowerInvariant()
    if ($raw -eq "") {
      return $Default
    }
    if (@("t", "tak", "y", "yes").Contains($raw)) {
      return $true
    }
    if (@("n", "nie", "no").Contains($raw)) {
      return $false
    }
    Write-Host "Wpisz t albo n."
  }
}

function Ask-Profile {
  Write-Host ""
  Write-Host "Wybierz profil pomiaru:"
  Write-Host "  1. mobile-slow4g  - telefon, wolne 4G, CPU x4 (najlepsze do klienta)"
  Write-Host "  2. mobile-fast4g  - telefon, szybsze 4G"
  Write-Host "  3. desktop-cable  - desktop, szybkie lacze"
  Write-Host "  4. no-throttle    - Twoj komputer bez symulacji"

  while ($true) {
    $raw = Read-Host "Profil [1]"
    if ($raw.Trim() -eq "") {
      return "mobile-slow4g"
    }

    switch ($raw.Trim()) {
      "1" { return "mobile-slow4g" }
      "2" { return "mobile-fast4g" }
      "3" { return "desktop-cable" }
      "4" { return "no-throttle" }
      "mobile-slow4g" { return "mobile-slow4g" }
      "mobile-fast4g" { return "mobile-fast4g" }
      "desktop-cable" { return "desktop-cable" }
      "no-throttle" { return "no-throttle" }
      default { Write-Host "Wybierz 1, 2, 3 albo 4." }
    }
  }
}

function Run-Audit {
  param(
    [string]$Url,
    [int]$Runs,
    [string]$Profile,
    [bool]$UseBudget,
    [bool]$OpenReport
  )

  $before = Get-Date

  $auditArgs = @(
    "run", "audit", "--",
    "--url", $Url,
    "--runs", "$Runs",
    "--profile", $Profile,
    "--out", "reports",
    "--format", "all",
    "--screenshot"
  )

  if ($UseBudget) {
    $auditArgs += @("--budget", "budgets.example.json", "--fail-on-budget")
  }

  Write-Host ""
  Write-Host "Start pomiaru"
  Write-Host "URL:    $Url"
  Write-Host "Profil: $Profile"
  Write-Host "Runy:   $Runs"
  Write-Host ""

  npm @auditArgs
  $exitCode = $LASTEXITCODE

  $latestReport = Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot "reports") -Recurse -Filter "*.html" -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -ge $before } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $latestReport) {
    $latestReport = Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot "reports") -Recurse -Filter "*.html" -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
  }

  if ($latestReport) {
    Write-Host ""
    Write-Host "Raport gotowy:"
    Write-Host $latestReport.FullName

    if ($OpenReport) {
      Invoke-Item -LiteralPath $latestReport.FullName
    }
  }

  if ($exitCode -ne 0) {
    Write-Host ""
    Write-Host "Uwaga: narzedzie zwrocilo kod $exitCode. Jesli wlaczyles budzet, to zwykle znaczy: strona przekroczyla limity."
  }
}

Write-Host ""
Write-Host "Interaktywny pomiar performance"
Write-Host "Wpisz domene, dostaniesz raport HTML z sekcja 'Po ludzku'."
Write-Host "Enter na pustej domenie konczy program."

while ($true) {
  Write-Host ""
  $rawUrl = Ask-Text -Prompt "Domena albo URL" -Default $DefaultUrl
  $url = Normalize-Url -RawUrl $rawUrl

  if ($url -eq "") {
    break
  }

  $profile = Ask-Profile
  $runs = Ask-Int -Prompt "Ile runow zrobic" -Default 3 -Min 1 -Max 20
  $useBudget = Ask-YesNo -Prompt "Sprawdzac performance budget" -Default $false
  $openReport = Ask-YesNo -Prompt "Otworzyc raport HTML po pomiarze" -Default $true

  Run-Audit -Url $url -Runs $runs -Profile $profile -UseBudget $useBudget -OpenReport $openReport

  $again = Ask-YesNo -Prompt "Zmierzyc kolejna domene" -Default $true
  if (-not $again) {
    break
  }
}

Write-Host ""
Write-Host "Koniec."
