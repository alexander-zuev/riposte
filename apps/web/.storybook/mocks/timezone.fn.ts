/** Storybook mock for `timezone.fn` — keeps the real server module (and its server-only imports)
 *  out of the browser bundle. Stories render with the UTC default, so these are never invoked. */
export async function getTimezoneServerFn(): Promise<string> {
  return 'UTC'
}

export async function setTimezoneServerFn(): Promise<null> {
  return null
}
