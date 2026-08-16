param(
  [switch]$ForceDownload,
  [switch]$SkipSelfExtract,
  [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$TemplatePath = Join-Path $Root "src\index.template.html"
$AppConfigPath = Join-Path $Root "app.config.json"
$DependenciesPath = Join-Path $Root "dependencies.json"
$VerifyPath = Join-Path $Root "scripts\verify-standalone.ps1"
$SelfExtractBuilderPath = Join-Path $Root "scripts\build-self-extract.ps1"

function Write-Step([string]$Message) { Write-Host "[Single HTML] $Message" -ForegroundColor Cyan }
function Get-Json([string]$Path) {
  if (-not (Test-Path $Path)) { throw "Required file not found: $Path" }
  return Get-Content -Raw -Encoding UTF8 $Path | ConvertFrom-Json
}
function ConvertTo-SafeJson([object]$Value, [int]$Depth = 30) {
  return ($Value | ConvertTo-Json -Compress -Depth $Depth).Replace("<", "\u003c").Replace(">", "\u003e").Replace("&", "\u0026")
}

$appConfig = Get-Json $AppConfigPath
$dependencyConfig = Get-Json $DependenciesPath
$dependencies = @()
if ($dependencyConfig.PSObject.Properties.Name -contains "dependencies") { $dependencies = @($dependencyConfig.dependencies) }
if ($dependencies.Count -ne 0) {
  throw "This app is intentionally dependency-free. dependencies.json must contain an empty dependencies array."
}

if ([string]::IsNullOrWhiteSpace($OutputPath)) { $OutputPath = [string]$appConfig.build.output }
if (-not [System.IO.Path]::IsPathRooted($OutputPath)) { $OutputPath = Join-Path $Root $OutputPath }
$outputDirectory = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

$generatedAt = [DateTime]::UtcNow.ToString("o")
$manifest = [ordered]@{
  schemaVersion = 1
  builder = "single-html-app-template-compatible/1.0"
  generatedAtUtc = $generatedAt
  app = [ordered]@{
    name = [string]$appConfig.name
    slug = [string]$appConfig.slug
    version = [string]$appConfig.version
  }
  dependencies = @()
}
$assetBundle = [ordered]@{ schemaVersion = 1; dependencies = [ordered]@{} }

Write-Step "Generating standalone HTML"
$template = [System.IO.File]::ReadAllText($TemplatePath, [System.Text.Encoding]::UTF8)
$assetBundleJson = ConvertTo-SafeJson $assetBundle 20
$replacements = [ordered]@{
  "__APP_CONFIG_JSON__" = ConvertTo-SafeJson $appConfig 20
  "__BUILD_MANIFEST_JSON__" = ConvertTo-SafeJson $manifest 20
  "__EMBEDDED_ASSET_BUNDLE_BASE64__" = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($assetBundleJson))
}
foreach ($entry in $replacements.GetEnumerator()) {
  $count = ([regex]::Matches($template, [regex]::Escape($entry.Key))).Count
  if ($count -ne 1) { throw "Template placeholder $($entry.Key) must occur exactly once; found $count." }
  $template = $template.Replace($entry.Key, [string]$entry.Value)
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($OutputPath, $template, $utf8NoBom)
[System.IO.File]::WriteAllText((Join-Path $outputDirectory "dependency-manifest.json"), ($manifest | ConvertTo-Json -Depth 20), $utf8NoBom)
[System.IO.File]::WriteAllText((Join-Path $outputDirectory ".nojekyll"), "", $utf8NoBom)

& $VerifyPath -Path $OutputPath -RequireNetworkBlock ([bool]$appConfig.build.blockRuntimeNetwork)

$selfExtractEnabled = $false
if (-not $SkipSelfExtract -and ($appConfig.build.PSObject.Properties.Name -contains "selfExtract")) {
  $selfExtractEnabled = [bool]$appConfig.build.selfExtract.enabled
}
if ($selfExtractEnabled) {
  $selfExtractOutput = [string]$appConfig.build.selfExtract.output
  if ([string]::IsNullOrWhiteSpace($selfExtractOutput)) { $selfExtractOutput = "dist/index.self-extract.html" }
  if (-not [System.IO.Path]::IsPathRooted($selfExtractOutput)) { $selfExtractOutput = Join-Path $Root $selfExtractOutput }
  & $SelfExtractBuilderPath -InputPath $OutputPath -OutputPath $selfExtractOutput
}

Write-Step "Built $($appConfig.name) $($appConfig.version)"
Write-Host "  $OutputPath"
