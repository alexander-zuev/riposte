export type Result<T> = { success: true; data: T }

export function ok<T>(data: T): Result<T> {
  return { success: true, data }
}
