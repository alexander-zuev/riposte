/**
 * Framework-agnostic logging utilities.
 * Provides standardized console logging with environment-aware configuration.
 */

/* -------------------------------------------------------------------------------------------------
 * Error hook — called on every logger.error() to forward errors to Sentry.
 *
 * Each runtime (browser, worker, SSR) registers its own hook via setLoggerErrorHook().
 * When no hook is registered (tests), logger.error() only writes to console.
 * ----------------------------------------------------------------------------------------------- */

export interface ErrorCaptureEntry {
  error: unknown
  /** User ID for Sentry user context. Undefined = anonymous. */
  distinctId: string | undefined
  context: Record<string, unknown>
}

export type LoggerErrorHook = (entry: ErrorCaptureEntry) => void

let errorHook: LoggerErrorHook | null = null

/** Register hook called on every logger.error(). Idempotent — overwrites previous. */
export function setLoggerErrorHook(fn: LoggerErrorHook): void {
  errorHook = fn
}

declare const window: unknown

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LoggerConfig {
  logLevel?: LogLevel | string
  colorize?: boolean
  enabled?: boolean
}

const getNodeEnv = (): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV || 'development'
  }
  return 'development'
}

const getLogLevel = (): string | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.LOG_LEVEL
  }
  return undefined
}

const getMinLogLevel = (): LogLevel => {
  const logLevelEnv = getLogLevel()?.toUpperCase()
  if (logLevelEnv && Object.values(LogLevel).includes(logLevelEnv as LogLevel)) {
    return logLevelEnv as LogLevel
  }

  const nodeEnv = getNodeEnv()
  switch (nodeEnv) {
    case 'development':
      return LogLevel.DEBUG
    case 'production':
      return LogLevel.DEBUG
    case 'test':
      return LogLevel.ERROR
    default:
      return LogLevel.DEBUG
  }
}

const getLogConfig = () => {
  const nodeEnv = getNodeEnv()
  const minLevel = getMinLogLevel()

  switch (nodeEnv) {
    case 'development':
      return { enabled: true, minLevel, colorize: true }
    case 'production':
      return { enabled: true, minLevel, colorize: false }
    case 'test':
      return { enabled: false, minLevel, colorize: false }
    default:
      return { enabled: true, minLevel, colorize: true }
  }
}

function isErrorLike(value: unknown): value is Error {
  return (
    value instanceof Error ||
    (typeof value === 'object' &&
      value !== null &&
      'message' in value &&
      typeof (value as any).message === 'string')
  )
}

const serializeError = (err: Error, depth = 0): Record<string, unknown> => {
  if (depth > 5) return { message: '[cause chain truncated]' }

  const obj: Record<string, unknown> = {
    name: err.name,
    message: err.message,
    stack: err.stack,
  }

  if (err.cause) {
    obj.cause = isErrorLike(err.cause) ? serializeError(err.cause as Error, depth + 1) : err.cause
  }

  for (const key of Object.keys(err)) {
    if (!(key in obj)) {
      obj[key] = (err as unknown as Record<string, unknown>)[key]
    }
  }
  return obj
}

const errorReplacer = (_key: string, value: unknown): unknown => {
  if (isErrorLike(value)) return serializeError(value as Error)
  return value
}

const formatObject = (obj: unknown, isDev: boolean): string => {
  try {
    const indent = isDev ? 2 : 0
    if (obj instanceof Error) {
      return JSON.stringify(serializeError(obj), errorReplacer, indent)
    }
    return JSON.stringify(obj, errorReplacer, indent)
  } catch {
    return '[Circular or Non-Serializable Object]'
  }
}

const stringifyLogEntry = (entry: Record<string, unknown>): string => {
  try {
    return JSON.stringify(entry, errorReplacer)
  } catch {
    return JSON.stringify({
      timestamp: entry.timestamp,
      level: entry.level,
      module: entry.module,
      message: entry.message,
      data: '[Circular or Non-Serializable Object]',
    })
  }
}

const isBrowserRuntime = (): boolean => typeof window !== 'undefined'

const supportsAnsiColor = (): boolean => {
  if (typeof process === 'undefined') return false
  if (process.env?.NO_COLOR !== undefined) return false
  if (process.env?.FORCE_COLOR === '0') return false
  if (process.env?.FORCE_COLOR !== undefined) return true
  if (getNodeEnv() === 'development' && process.env?.CI === undefined) return true
  return process.stdout?.isTTY === true
}

const ansi = {
  gray: (value: string) => `\x1b[90m${value}\x1b[0m`,
  blue: (value: string) => `\x1b[34m${value}\x1b[0m`,
  green: (value: string) => `\x1b[32m${value}\x1b[0m`,
  yellow: (value: string) => `\x1b[33m${value}\x1b[0m`,
  red: (value: string) => `\x1b[31m${value}\x1b[0m`,
}

const colorizeLevelAnsi = (level: LogLevel): string => {
  switch (level) {
    case LogLevel.DEBUG:
      return ansi.blue(level)
    case LogLevel.INFO:
      return ansi.green(level)
    case LogLevel.WARN:
      return ansi.yellow(level)
    case LogLevel.ERROR:
      return ansi.red(level)
  }
}

export class Logger {
  private module: string
  private config: ReturnType<typeof getLogConfig>
  private isDev: boolean

  constructor(module: string, overrideConfig?: LoggerConfig) {
    this.module = module
    this.config = getLogConfig()
    this.isDev = getNodeEnv() === 'development'

    if (overrideConfig) {
      if (overrideConfig.logLevel !== undefined) {
        const level =
          typeof overrideConfig.logLevel === 'string'
            ? (overrideConfig.logLevel as LogLevel)
            : overrideConfig.logLevel
        if (Object.values(LogLevel).includes(level)) {
          this.config.minLevel = level
        }
      }
      if (overrideConfig.colorize !== undefined) {
        this.config.colorize = overrideConfig.colorize
      }
      if (overrideConfig.enabled !== undefined) {
        this.config.enabled = overrideConfig.enabled
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false

    if (getNodeEnv() === 'production' && isBrowserRuntime()) {
      return false
    }

    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]
    const minLevelIndex = levels.indexOf(this.config.minLevel)
    const currentLevelIndex = levels.indexOf(level)

    return currentLevelIndex >= minLevelIndex
  }

  private formatArgs(args: unknown[]): unknown[] {
    return args.map((arg) => {
      if (arg === null || arg === undefined) return arg
      if (typeof arg === 'object') return formatObject(arg, this.isDev)
      return arg
    })
  }

  private log(level: LogLevel, message: string, ...args: unknown[]) {
    if (!this.shouldLog(level)) return

    const timestamp = new Date().toISOString()

    if (this.config.colorize && isBrowserRuntime()) {
      const formattedArgs = this.formatArgs(args)
      const levelColors: Record<LogLevel, string> = {
        [LogLevel.DEBUG]: 'color: #5b9bd5',
        [LogLevel.INFO]: 'color: #6dbf6d',
        [LogLevel.WARN]: 'color: #d4a843',
        [LogLevel.ERROR]: 'color: #e06c75',
      }
      const levelStyle = levelColors[level] || 'color: inherit'

      const devFn =
        level === LogLevel.ERROR
          ? console.error
          : level === LogLevel.WARN
            ? console.warn
            : console.log
      devFn(
        `%c[${timestamp}] %c[${level}] %c[${this.module}]%c ${message}`,
        'color: gray',
        levelStyle,
        'color: #61afef',
        'color: inherit',
        ...formattedArgs,
      )
    } else if (this.config.colorize && supportsAnsiColor()) {
      const formattedArgs = this.formatArgs(args)
      const devFn =
        level === LogLevel.ERROR
          ? console.error
          : level === LogLevel.WARN
            ? console.warn
            : console.log

      devFn(
        `${ansi.gray(`[${timestamp}]`)} [${colorizeLevelAnsi(level)}] ${ansi.blue(
          `[${this.module}]`,
        )} ${message}`,
        ...formattedArgs,
      )
    } else {
      const entry: Record<string, unknown> = {
        timestamp,
        level,
        module: this.module,
        message,
      }
      if (args.length === 1) {
        entry.data = args[0]
      } else if (args.length > 1) {
        entry.data = args
      }

      const json = stringifyLogEntry(entry)
      const prodFn =
        level === LogLevel.ERROR
          ? console.error
          : level === LogLevel.WARN
            ? console.warn
            : console.log
      prodFn(json)
    }
  }

  debug(message: string, ...args: unknown[]) {
    this.log(LogLevel.DEBUG, message, ...args)
  }

  info(message: string, ...args: unknown[]) {
    this.log(LogLevel.INFO, message, ...args)
  }

  warn(message: string, ...args: unknown[]) {
    this.log(LogLevel.WARN, message, ...args)
  }

  error(message: string, context?: { error?: unknown; userId?: string; [key: string]: unknown }) {
    this.log(LogLevel.ERROR, message, ...(context ? [context] : []))

    if (errorHook && context?.error) {
      const { error, userId, ...rest } = context
      errorHook({
        error,
        distinctId: userId,
        context: rest,
      })
    }
  }
}

export function createLogger(module: string, config?: LoggerConfig): Logger {
  return new Logger(module, config)
}
