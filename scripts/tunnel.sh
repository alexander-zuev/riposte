#!/bin/sh
# Cloudflare Tunnel for local dev → tunnel.riposte.sh
# Token stored in ~/.cloudflare-tunnels/riposte-dev

TOKEN_FILE="$HOME/.cloudflare-tunnels/riposte-dev"

if [ ! -f "$TOKEN_FILE" ]; then
  echo "⏭  Tunnel skipped: no token file at $TOKEN_FILE"
  exit 0
fi

. "$TOKEN_FILE"

if [ -z "$TUNNEL_TOKEN" ]; then
  echo "⏭  Tunnel skipped: TUNNEL_TOKEN not set in $TOKEN_FILE"
  exit 0
fi

echo "🚇 Starting tunnel → tunnel.riposte.sh"
exec cloudflared tunnel run --token "$TUNNEL_TOKEN"
