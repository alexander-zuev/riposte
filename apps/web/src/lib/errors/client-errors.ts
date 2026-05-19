type TaggedClientError = {
  _tag: string
  message?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isTaggedClientError(error: unknown): error is TaggedClientError {
  return isRecord(error) && typeof error._tag === 'string'
}

export function isTaggedErrorWithTag<const TTag extends string>(
  error: unknown,
  tag: TTag,
): error is TaggedClientError & { _tag: TTag } {
  return isTaggedClientError(error) && error._tag === tag
}
