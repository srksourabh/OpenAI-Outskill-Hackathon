#!/usr/bin/env sh
set -eu

run_if_available() {
  command_name="$1"
  shift

  if command -v "$command_name" >/dev/null 2>&1; then
    "$@"
  else
    echo "Skipping $command_name command because it is not installed."
  fi
}

detect_package_manager() {
  if [ -f pnpm-lock.yaml ] && command -v pnpm >/dev/null 2>&1; then
    echo "pnpm"
  elif [ -f yarn.lock ] && command -v yarn >/dev/null 2>&1; then
    echo "yarn"
  elif command -v npm >/dev/null 2>&1; then
    echo "npm"
  else
    echo ""
  fi
}

package_script_exists() {
  script_name="$1"

  if command -v node >/dev/null 2>&1; then
    node -e "const scripts = require('./package.json').scripts || {}; process.exit(scripts[process.argv[1]] ? 0 : 1)" "$script_name"
  else
    grep -E "\"$script_name\"[[:space:]]*:" package.json >/dev/null 2>&1
  fi
}

run_package_script_if_present() {
  package_manager="$1"
  script_name="$2"

  if package_script_exists "$script_name"; then
    "$package_manager" run "$script_name"
  else
    echo "Skipping $package_manager run $script_name because the script is not defined."
  fi
}

echo "Running verification..."

if [ -f package.json ]; then
  package_manager="$(detect_package_manager)"

  if [ -z "$package_manager" ]; then
    echo "Skipping package scripts because no supported package manager is installed."
  else
    run_package_script_if_present "$package_manager" lint
    run_package_script_if_present "$package_manager" test
    run_package_script_if_present "$package_manager" build
  fi
elif [ -f pyproject.toml ] || [ -f requirements.txt ]; then
  if [ -d tests ]; then
    run_if_available python python -m pytest
  else
    echo "Skipping Python tests because tests directory is missing."
  fi
elif [ -f go.mod ]; then
  run_if_available go go test ./...
elif [ -f Cargo.toml ]; then
  run_if_available cargo cargo test
else
  echo "No supported stack detected. Nothing to verify yet."
fi

echo "Verification complete."
