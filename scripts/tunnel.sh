#!/bin/sh
# Cloudflare Tunnel for local dev → tunnel.riposte.sh

if [ -z "${TUNNEL_TOKEN:-}" ]; then
  echo "⚠️  Tunnel skipped: TUNNEL_TOKEN is not set"
  exit 0
fi

echo "🚇 Starting tunnel → tunnel.riposte.sh"
cloudflared tunnel run --token "$TUNNEL_TOKEN"
status=$?

echo "⚠️  Tunnel stopped with exit code $status"
exit 0
