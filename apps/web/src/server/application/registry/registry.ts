import {
  getSessionStatus,
  handleUserSignedUp,
  sendWelcomeEmail,
} from '@server/application/handlers/auth-handler'

import type { CommandRegistry, EventRegistry, QueryRegistry } from './types'

export const COMMAND_HANDLERS = {
  SendWelcomeEmail: sendWelcomeEmail,
} satisfies CommandRegistry

export const EVENT_HANDLERS: EventRegistry = {
  UserSignedUp: [handleUserSignedUp],
}

export const QUERY_HANDLERS = {
  GetSessionStatus: getSessionStatus,
} satisfies QueryRegistry
