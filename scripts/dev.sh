#!/bin/sh
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  exec turbo run dev --ui=stream
else
  exec turbo run dev
fi
