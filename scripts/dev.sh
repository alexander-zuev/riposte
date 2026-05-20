#!/bin/sh

cleanup() {
  if [ -n "${TUNNEL_PID:-}" ]; then
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi
}

start_tunnel() {
  pnpm --filter @riposte/web run tunnel &
  TUNNEL_PID=$!
}

trap cleanup EXIT INT TERM

start_tunnel

if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  turbo run dev --ui=stream
else
  turbo run dev --ui=stream
fi

status=$?
cleanup
exit "$status"
