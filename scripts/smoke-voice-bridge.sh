#!/usr/bin/env bash
set -euo pipefail

PORT="${VOICE_BRIDGE_PORT:-3025}"
VOICE_BRIDGE_PORT="$PORT" npm run voice:dev >/tmp/voice-bridge-smoke.out.log 2>/tmp/voice-bridge-smoke.err.log &
pid=$!
trap 'kill "$pid" >/dev/null 2>&1 || true' EXIT

sleep 8
curl --fail --silent "http://localhost:${PORT}/health"
