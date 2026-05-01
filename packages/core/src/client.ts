/**
 * @riposte/core/client - Browser-safe entry point
 *
 * Excludes server-only code.
 * Safe for bundling in frontend applications.
 *
 * Exports:
 * - domain/         Business concepts, primitives
 * - errors/         Error classes (client-safe)
 * - logger/         Console logger (client-safe)
 */

export * from './domain/messaging'
export * from './domain/primitives'
export * from './domain/auth'
export * from './infrastructure/errors'
export * from './infrastructure/logger'
