param(
  [Parameter(Mandatory = $true)][string]$Path,
  [bool]$RequireNetworkBlock = $true
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
if (-not (Test-Path $Path)) { throw "Standalone file not found: $Path" }
$html = [System.IO.File]::ReadAllText((Resolve-Path $Path), [System.Text.Encoding]::UTF8)

foreach ($placeholder in @("__APP_CONFIG_JSON__", "__BUILD_MANIFEST_JSON__", "__EMBEDDED_ASSET_BUNDLE_BASE64__")) {
  if ($html.Contains($placeholder)) { throw "Unresolved build placeholder: $placeholder" }
}
if ($html -notmatch '(?is)<!doctype\s+html>') { throw "DOCTYPE is missing." }
if ($html -notmatch '(?is)<meta\s+charset=["'']?utf-8') { throw "UTF-8 charset declaration is missing." }
if ($RequireNetworkBlock -and $html -notmatch '(?is)connect-src\s+''none''') { throw "Runtime CSP must contain connect-src 'none'." }

$externalPatterns = @(
  '(?is)<script[^>]+src\s*=\s*["'']\s*(?:https?:)?//',
  '(?is)<link[^>]+href\s*=\s*["'']\s*(?:https?:)?//',
  '(?is)<img[^>]+src\s*=\s*["'']\s*(?:https?:)?//',
  '(?is)<iframe[^>]+src\s*=\s*["'']\s*(?:https?:)?//',
  '(?is)@import\s+(?:url\()?\s*["'']?\s*(?:https?:)?//'
)
foreach ($pattern in $externalPatterns) {
  if ($html -match $pattern) { throw "External runtime asset reference detected: $($Matches[0])" }
}

$required = @(
  'id="timerTime"',
  'documentPictureInPicture',
  'requestPictureInPicture',
  'FLOW',
  'connect-src ''none''',
  'LocalStorage',
  'Picture in Picture'
)
foreach ($item in $required) { if (-not $html.Contains($item)) { throw "Required app content missing: $item" } }

Write-Host "Standalone verification passed: $Path" -ForegroundColor Green
