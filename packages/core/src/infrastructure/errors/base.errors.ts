export abstract class BaseError extends Error {
  /** Whether this error is transient and the operation should be retried */
  retryable: boolean = false

  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
    /** Optional error code for client consumption. Serializes over RPC. */
    public readonly code?: string,
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Business logic violations (e.g., duplicate email, invalid state)
 * Business rule violations are never retryable - the rules won't change on retry
 */
export abstract class DomainError extends BaseError {
  override retryable: boolean = false
}

/**
 * External system failures (e.g., database, APIs, storage)
 * External I/O failures are usually transient - retry by default
 */

export abstract class InfrastructureError extends BaseError {
  override retryable: boolean = true
}

/**
 * Use case / orchestration failures
 * Workflow/orchestration failures are usually transient - retry by default
 */
export abstract class ApplicationError extends BaseError {
  override retryable: boolean = true
}
