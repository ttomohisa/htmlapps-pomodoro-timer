param([switch]$ForceDownload)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$required = @(
  "AGENTS.md","APP_SPEC.md","app.config.json","dependencies.json","src\index.template.html",
  "build-standalone.ps1","scripts\build-self-extract.ps1","scripts\verify-standalone.ps1",
  "scripts\verify-self-extract.ps1","README.md","README.ja.md","LICENSE","THIRD_PARTY_NOTICES.md",
  "schemas\app-config.schema.json","schemas\dependencies.schema.json"
)
foreach ($relative in $required) { if (-not (Test-Path (Join-Path $Root $relative))) { throw "Required repository file is missing: $relative" } }
$app = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "app.config.json") | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace([string]$app.name)) { throw "app.config.json: name is required" }
if ([string]::IsNullOrWhiteSpace([string]$app.slug)) { throw "app.config.json: slug is required" }
if ([string]::IsNullOrWhiteSpace([string]$app.version)) { throw "app.config.json: version is required" }
# Check committed distribution snapshots BEFORE regeneration, so a stale tagged HTML
# cannot slip into a release merely because the build itself succeeds.
$distHtml = Join-Path $Root "dist\index.html"
$rootHtml = Join-Path $Root "pomodoro-timer.html"
$selfExtractHtml = Join-Path $Root "dist\index.self-extract.html"
$dependencyManifest = Join-Path $Root "dist\dependency-manifest.json"
$selfExtractManifest = Join-Path $Root "dist\self-extract-manifest.json"
foreach ($path in @($distHtml, $rootHtml, $selfExtractHtml, $dependencyManifest, $selfExtractManifest)) {
  if (-not (Test-Path -LiteralPath $path)) { throw "Committed standalone artifact is missing: $path" }
}
$committed = Get-Content -Raw -Encoding UTF8 $dependencyManifest | ConvertFrom-Json
if ([string]$committed.app.version -ne [string]$app.version) { throw "Committed standalone HTML version is stale." }
$distHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $distHtml).Hash.ToLowerInvariant()
$rootHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $rootHtml).Hash.ToLowerInvariant()
if ($distHash -ne $rootHash) { throw "Portable HTML and committed dist/index.html differ." }
$selfManifest = Get-Content -Raw -Encoding UTF8 $selfExtractManifest | ConvertFrom-Json
if ([string]$selfManifest.sourceSha256 -ne $distHash) { throw "Committed self-extract manifest does not match dist/index.html." }
& (Join-Path $Root "scripts\verify-self-extract.ps1") -Path $selfExtractHtml -ExpectedInputPath $distHtml
# Both static copies are checked above; the build below checks the current source template.
$buildArguments = @{}; if ($ForceDownload) { $buildArguments.ForceDownload = $true }
& (Join-Path $Root "build-standalone.ps1") @buildArguments
$html = [System.IO.File]::ReadAllText((Join-Path $Root "dist\index.html"), [System.Text.Encoding]::UTF8)
foreach ($item in @("Pomodoro Timer","documentPictureInPicture","requestPictureInPicture","Flow","気が散った")) { if (-not $html.Contains($item)) { throw "Required content missing: $item" } }
# Run the same dependency-free regression suite against source and every shipped variant.
$testFiles = @(Get-ChildItem -Path (Join-Path $Root "tests") -Filter "*.test.cjs" | Sort-Object Name | ForEach-Object { $_.FullName })
$previousTestHtml = $env:POMODORO_TEST_HTML
try {
  foreach ($variant in @("src/index.template.html", "dist/index.html", "pomodoro-timer.html", "dist/index.self-extract.html")) {
    $env:POMODORO_TEST_HTML = $variant
    & node --test @testFiles
    if ($LASTEXITCODE -ne 0) { throw "App regression tests failed: $variant" }
  }
} finally { $env:POMODORO_TEST_HTML = $previousTestHtml }
Write-Host "[OK] Repository check passed." -ForegroundColor Green
