/**
 * Configure automatic ping/pong responses for hibernatable WebSocket DOs.
 */
export function setupAutoPingPong(ctx: DurableObjectState): void {
  ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))
}

/**
 * Create and accept a WebSocket connection, returning the client upgrade response.
 */
export function upgradeToWebSocketResponse(ctx: DurableObjectState): Response {
  const pair = new WebSocketPair()
  const client = pair[0]
  const server = pair[1]

  ctx.acceptWebSocket(server)
  return new Response(null, { status: 101, webSocket: client })
}

/**
 * Normalize synthetic/reserved close codes to a safe close code.
 */
export function safeCloseCode(code: number): number {
  return code === 1005 || code === 1006 ? 1000 : code
}

/**
 * Checks if an incoming websocket message is a subscribe signal.
 */
export function isSubscribeMessage(message: string | ArrayBuffer): boolean {
  return typeof message === 'string' && message === 'subscribe'
}

/**
 * Safe JSON.parse — returns parsed value or null on invalid JSON.
 * Avoids double-parse in error handlers.
 */
export function safeParseJson(message: string): unknown {
  try {
    return JSON.parse(message)
  } catch {
    return null
  }
}

/**
 * Acknowledge a WebSocket close from the client side.
 * Swallows errors — the socket may already be fully closed (tab kill, abnormal disconnect).
 */
export function safeClose(ws: WebSocket, code: number, reason: string): void {
  try {
    ws.close(safeCloseCode(code), reason)
  } catch {
    // Socket already closed — nothing to do.
  }
}

/**
 * Shared webSocketError handler. Logs the error and closes with 1011.
 */
export function handleWebSocketError(
  ws: WebSocket,
  error: unknown,
  logger: { warn: (msg: string, ctx: Record<string, unknown>) => void },
): void {
  logger.warn('ws_error', {
    error: error instanceof Error ? error.message : String(error),
  })
  safeClose(ws, 1011, 'Internal error')
}

/**
 * Broadcast payload to all connected sockets.
 * Returns the number of sockets attempted.
 */
export function broadcastToSockets(ctx: DurableObjectState, payload: string): number {
  const sockets = ctx.getWebSockets()
  for (const socket of sockets) {
    try {
      socket.send(payload)
    } catch {
      // Disconnected sockets are cleaned up by runtime close handlers.
    }
  }
  return sockets.length
}
