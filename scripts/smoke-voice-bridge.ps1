param(
  [int]$Port = 3025
)

$ErrorActionPreference = "Stop"
$env:VOICE_BRIDGE_PORT = [string]$Port
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $env:TEMP "voice-bridge-smoke.out.log"
$err = Join-Path $env:TEMP "voice-bridge-smoke.err.log"
Remove-Item $out, $err -ErrorAction SilentlyContinue

$npmCommand = if ($IsWindows -or $PSVersionTable.PSEdition -eq "Desktop") { "npm.cmd" } else { "npm" }
$process = Start-Process -FilePath $npmCommand -ArgumentList @("run", "voice:dev") -WindowStyle Hidden -WorkingDirectory $root -RedirectStandardOutput $out -RedirectStandardError $err -PassThru
try {
  Start-Sleep -Seconds 8
  $response = Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/health"
  if ($response.StatusCode -ne 200) {
    throw "Voice bridge health check returned $($response.StatusCode)"
  }
  Write-Output $response.Content
} finally {
  Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
}
