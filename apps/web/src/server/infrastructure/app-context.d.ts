import type { AppDeps } from './app-deps'
import type { Session, User } from './auth/types'

declare module '@tanstack/react-start' {
  interface Register {
    server: {
      requestContext: {
        deps: AppDeps
        user?: User
        session?: Session
      }
    }
  }
}

declare module '@tanstack/react-router' {
  interface Register {
    server: {
      requestContext: {
        deps: AppDeps
        user?: User
        session?: Session
      }
    }
  }
}
