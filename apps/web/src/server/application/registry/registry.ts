import {
  getSessionStatus,
  handleUserSignedUp,
  sendWelcomeEmail,
} from '@server/application/handlers/auth-handler'
import { joinWaitlist } from '@server/application/handlers/waitlist-handler'

import type { CommandRegistry, EventRegistry, QueryRegistry } from './types'

export const COMMAND_HANDLERS = {
  JoinWaitlist: joinWaitlist,
  SendWelcomeEmail: sendWelcomeEmail,
} satisfies CommandRegistry

export const EVENT_HANDLERS: EventRegistry = {
  UserSignedUp: [{ id: 'auth.handleUserSignedUp', handle: handleUserSignedUp }],
}

export const QUERY_HANDLERS = {
  GetSessionStatus: getSessionStatus,
} satisfies QueryRegistry
