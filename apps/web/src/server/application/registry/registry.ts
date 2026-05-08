import {
  getSessionStatus,
  handleUserSignedUp,
  sendMagicLink,
  sendWelcomeEmail,
} from '@server/application/handlers/auth-handler'
import { getConnectionsStatus } from '@server/application/handlers/connection-handler'
import { joinWaitlist } from '@server/application/handlers/waitlist-handler'
import { Result } from 'better-result'

import type { CommandRegistry, EventRegistry, MessageRegistry, QueryRegistry } from './types'

const stubHandler = async () => Result.ok(undefined)

export const COMMAND_HANDLERS = {
  JoinWaitlist: joinWaitlist,
  SendMagicLink: sendMagicLink,
  SendWelcomeEmail: sendWelcomeEmail,
  IngestDisputeCreated: stubHandler,
  IngestDisputeUpdated: stubHandler,
  IngestDisputeClosed: stubHandler,
  IngestDisputeFundsReinstated: stubHandler,
  IngestDisputeFundsWithdrawn: stubHandler,
} satisfies CommandRegistry

export const EVENT_HANDLERS: EventRegistry = {
  UserSignedUp: [{ id: 'auth.handleUserSignedUp', handle: handleUserSignedUp }],
}

export const QUERY_HANDLERS = {
  GetSessionStatus: getSessionStatus,
  GetConnectionsStatus: getConnectionsStatus,
} satisfies QueryRegistry

export const defaultRegistry = {
  commands: COMMAND_HANDLERS,
  events: EVENT_HANDLERS,
  queries: QUERY_HANDLERS,
} satisfies MessageRegistry
