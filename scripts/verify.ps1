Write-Host "Running verification..."

if (Test-Path "package.json") {
  npm run lint
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  npm run test
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  npm run build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
  Write-Host "No supported stack detected. Nothing to verify yet."
}

Write-Host "Verification complete."
