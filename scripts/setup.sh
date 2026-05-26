#!/usr/bin/env sh
set -eu

echo "Setting up project..."

if [ -f pnpm-lock.yaml ]; then
  echo "Detected pnpm lockfile. Installing with pnpm install..."
  pnpm install
elif [ -f yarn.lock ]; then
  echo "Detected yarn lockfile. Installing with yarn install..."
  yarn install
elif [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then
  echo "Detected npm lockfile. Installing with npm ci..."
  npm ci
elif [ -f package.json ]; then
  echo "Detected package.json. Installing with npm install..."
  npm install
elif [ -f requirements.txt ]; then
  echo "Detected requirements.txt. Installing with pip..."
  python -m pip install -r requirements.txt
elif [ -f pyproject.toml ]; then
  echo "Detected pyproject.toml. Install dependencies with the project's selected Python tool."
elif [ -f go.mod ]; then
  echo "Detected go.mod. Downloading Go modules..."
  go mod download
elif [ -f Cargo.toml ]; then
  echo "Detected Cargo.toml. Fetching Cargo dependencies..."
  cargo fetch
else
  echo "No supported dependency manifest found. Skipping dependency install."
fi

echo ""
echo "Next steps:"
echo "1. Review PRD.md and TASKS.md."
echo "2. Choose the application stack."
echo "3. Run ./scripts/verify.sh after changes."
