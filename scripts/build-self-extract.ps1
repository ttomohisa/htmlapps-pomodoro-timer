param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
if (-not (Test-Path $InputPath)) { throw "Input file not found: $InputPath" }
if (-not [System.IO.Path]::IsPathRooted($OutputPath)) {
  $Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
  $OutputPath = Join-Path $Root $OutputPath
}
$inputBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $InputPath))
$memory = New-Object System.IO.MemoryStream
$gzip = New-Object System.IO.Compression.GZipStream($memory, [System.IO.Compression.CompressionMode]::Compress, $true)
try { $gzip.Write($inputBytes, 0, $inputBytes.Length) } finally { $gzip.Dispose() }
$compressed = $memory.ToArray(); $memory.Dispose()
$base64 = [Convert]::ToBase64String($compressed)
$sha = (Get-FileHash -Algorithm SHA256 -Path $InputPath).Hash.ToLowerInvariant()
$escapedName = [System.Security.SecurityElement]::Escape([System.IO.Path]::GetFileName($InputPath))
$inputHtml = [System.Text.Encoding]::UTF8.GetString($inputBytes)
$faviconMatch = [regex]::Match($inputHtml, '<link\b[^>]*rel="icon"[^>]*>')
if (-not $faviconMatch.Success) { throw "Input HTML must include its canonical favicon." }
$faviconLink = $faviconMatch.Value
$wrapper = @"
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob:; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'">
<title>Pomodoro Timer - self extract</title>
$faviconLink
<style>html,body{height:100%;margin:0;background:#f5f5f2;color:#20211f;font:14px system-ui,sans-serif}body{display:grid;place-items:center}.box{max-width:480px;padding:28px;text-align:center}.spin{width:34px;height:34px;margin:0 auto 16px;border:3px solid #d9dbd6;border-top-color:#16624f;border-radius:50%;animation:s .8s linear infinite}@keyframes s{to{transform:rotate(360deg)}}.err{color:#b3261e;white-space:pre-wrap}</style>
</head>
<body><div class="box"><div class="spin"></div><strong>Opening Pomodoro Timer…</strong><p id="status">Decompressing the embedded standalone app.</p></div>
<script id="payload" type="application/octet-stream">$base64</script>
<script>
(async()=>{try{if(!('DecompressionStream'in window))throw new Error('This browser does not support DecompressionStream. Open the regular index.html instead.');const b64=document.getElementById('payload').textContent.trim();const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));const html=await new Response(stream).text();document.open();document.write(html);document.close();}catch(e){document.querySelector('.spin').remove();const s=document.getElementById('status');s.className='err';s.textContent=String(e&&e.message||e);}})();
</script></body></html>
"@
$directory = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Force -Path $directory | Out-Null
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($OutputPath, $wrapper, $utf8NoBom)
$manifest = [ordered]@{
  schemaVersion = 1
  sourceFile = $escapedName
  sourceBytes = $inputBytes.Length
  sourceSha256 = $sha
  compressedBytes = $compressed.Length
  encoding = "gzip+base64"
  generatedAtUtc = [DateTime]::UtcNow.ToString("o")
}
[System.IO.File]::WriteAllText((Join-Path $directory "self-extract-manifest.json"), ($manifest | ConvertTo-Json -Depth 10), $utf8NoBom)
& (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "verify-self-extract.ps1") -Path $OutputPath -ExpectedInputPath $InputPath
Write-Host "Self-extract build passed: $OutputPath" -ForegroundColor Green
