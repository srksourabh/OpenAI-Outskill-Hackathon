Write-Host "Setting up project..."

if (Test-Path "package-lock.json") {
  npm ci
} elseif (Test-Path "package.json") {
  npm install
} else {
  Write-Host "No supported dependency manifest found."
}

Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Run npm run dev."
Write-Host "2. Open http://localhost:3000/campaigns."
Write-Host "3. Run .\scripts\verify.ps1 before shipping."
