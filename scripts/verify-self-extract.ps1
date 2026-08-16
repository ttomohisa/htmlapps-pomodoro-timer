param(
  [Parameter(Mandatory = $true)][string]$Path,
  [Parameter(Mandatory = $true)][string]$ExpectedInputPath
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
if (-not (Test-Path $Path)) { throw "Self-extract file not found: $Path" }
if (-not (Test-Path $ExpectedInputPath)) { throw "Expected input file not found: $ExpectedInputPath" }
$html = [System.IO.File]::ReadAllText((Resolve-Path $Path), [System.Text.Encoding]::UTF8)
$match = [regex]::Match($html, '(?is)<script id="payload" type="application/octet-stream">\s*([^<]+?)\s*</script>')
if (-not $match.Success) { throw "Embedded payload was not found." }
try { $compressed = [Convert]::FromBase64String($match.Groups[1].Value.Trim()) } catch { throw "Embedded payload is not valid base64." }
$input = New-Object System.IO.MemoryStream
$input.Write($compressed, 0, $compressed.Length)
$input.Position = 0
$gzip = New-Object System.IO.Compression.GZipStream($input, [System.IO.Compression.CompressionMode]::Decompress)
$output = New-Object System.IO.MemoryStream
try { $gzip.CopyTo($output) } finally { $gzip.Dispose(); $input.Dispose() }
$decoded = $output.ToArray(); $output.Dispose()
$expected = [System.IO.File]::ReadAllBytes((Resolve-Path $ExpectedInputPath))
if ($decoded.Length -ne $expected.Length) { throw "Self-extract payload length mismatch." }
$sha = [Security.Cryptography.SHA256]::Create()
try {
  $decodedHash = ([BitConverter]::ToString($sha.ComputeHash($decoded))).Replace('-','').ToLowerInvariant()
  $expectedHash = ([BitConverter]::ToString($sha.ComputeHash($expected))).Replace('-','').ToLowerInvariant()
} finally { $sha.Dispose() }
if ($decodedHash -ne $expectedHash) { throw "Self-extract payload hash mismatch." }
Write-Host "Self-extract verification passed: $Path" -ForegroundColor Green
