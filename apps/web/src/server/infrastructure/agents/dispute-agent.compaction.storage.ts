export const DISPUTE_AGENT_SESSION_ID = ''

export type DisputeAgentCompactionOverlay = {
  id: string
  sessionId: string
  summary: string
  fromMessageId: string
  toMessageId: string
  createdAt: string
}

type CompactionRow = {
  id: string
  session_id: string
  summary: string
  from_message_id: string
  to_message_id: string
  created_at: string
}

export function migrateDisputeAgentCompactionStorage(storage: DurableObjectStorage): void {
  storage.sql.exec(`
    CREATE TABLE IF NOT EXISTS assistant_compactions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL,
      from_message_id TEXT NOT NULL,
      to_message_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

export function createDisputeAgentCompactionStore(storage: DurableObjectStorage) {
  return {
    add(args: {
      sessionId: string
      summary: string
      fromMessageId: string
      toMessageId: string
    }): DisputeAgentCompactionOverlay {
      const id = crypto.randomUUID()
      storage.sql.exec(
        `
          INSERT INTO assistant_compactions (
            id,
            session_id,
            summary,
            from_message_id,
            to_message_id
          )
          VALUES (?, ?, ?, ?, ?)
        `,
        id,
        args.sessionId,
        args.summary,
        args.fromMessageId,
        args.toMessageId,
      )
      return {
        id,
        sessionId: args.sessionId,
        summary: args.summary,
        fromMessageId: args.fromMessageId,
        toMessageId: args.toMessageId,
        createdAt: new Date().toISOString(),
      }
    },

    list(sessionId: string): DisputeAgentCompactionOverlay[] {
      return storage.sql
        .exec<CompactionRow>(
          `
            SELECT
              id,
              session_id,
              summary,
              from_message_id,
              to_message_id,
              created_at
            FROM assistant_compactions
            WHERE session_id = ?
            ORDER BY created_at ASC
          `,
          sessionId,
        )
        .toArray()
        .map((row) => ({
          id: row.id,
          sessionId: row.session_id,
          summary: row.summary,
          fromMessageId: row.from_message_id,
          toMessageId: row.to_message_id,
          createdAt: row.created_at,
        }))
    },

    clear(sessionId: string): void {
      storage.sql.exec('DELETE FROM assistant_compactions WHERE session_id = ?', sessionId)
    },
  }
}
