import { PlaybookEditError } from '@riposte/core'
import { Result } from 'better-result'

/**
 * Apply a find-and-replace edit to playbook markdown. Pure: no I/O and no revision logic.
 * Given the current content plus old/new strings it returns the new content, or a tagged
 * error when the target cannot be located unambiguously. The caller turns the returned
 * content into the next revision; on `Err` it persists nothing.
 *
 * Matching is exact-first, then whitespace-tolerant — it never falls back to a whole
 * rewrite and never guesses semantically:
 *   1. exact substring (sub-line and exact multi-line edits)
 *   2. line-based match ignoring per-line leading/trailing whitespace (multi-line blocks
 *      whose indentation or trailing spaces drifted)
 * Zero matches -> `edit_not_found`; more than one -> `edit_ambiguous`. Result EOLs are `\n`.
 */
export function applyPlaybookEdit(
  content: string,
  oldText: string,
  newText: string,
): Result<string, PlaybookEditError> {
  const normalizedContent = content.replace(/\r\n/g, '\n')
  const normalizedOld = oldText.replace(/\r\n/g, '\n')
  const normalizedNew = newText.replace(/\r\n/g, '\n')

  const exactCount = countOccurrences(normalizedContent, normalizedOld)
  if (exactCount === 1) {
    const idx = normalizedContent.indexOf(normalizedOld)
    return Result.ok(
      normalizedContent.slice(0, idx) +
        normalizedNew +
        normalizedContent.slice(idx + normalizedOld.length),
    )
  }
  if (exactCount > 1) {
    return Result.err(new PlaybookEditError({ kind: 'edit_ambiguous', matchCount: exactCount }))
  }

  const contentLines = normalizedContent.split('\n')
  const oldLines = dropTrailingEmpty(normalizedOld.split('\n'))
  const starts = findLineBlockMatches(contentLines, oldLines)
  const start = starts[0]
  if (starts.length === 1 && start !== undefined) {
    const replaced = [
      ...contentLines.slice(0, start),
      ...normalizedNew.split('\n'),
      ...contentLines.slice(start + oldLines.length),
    ].join('\n')
    return Result.ok(replaced)
  }
  if (starts.length > 1) {
    return Result.err(new PlaybookEditError({ kind: 'edit_ambiguous', matchCount: starts.length }))
  }
  return Result.err(new PlaybookEditError({ kind: 'edit_not_found', matchCount: 0 }))
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0
  let count = 0
  let idx = haystack.indexOf(needle)
  while (idx !== -1) {
    count += 1
    idx = haystack.indexOf(needle, idx + needle.length)
  }
  return count
}

function dropTrailingEmpty(lines: string[]): string[] {
  const out = [...lines]
  while (out.length > 1 && (out[out.length - 1] ?? '').trim() === '') out.pop()
  return out
}

function findLineBlockMatches(contentLines: string[], oldLines: string[]): number[] {
  const blockLength = oldLines.length
  if (blockLength === 0) return []
  const trimmedOld = oldLines.map((line) => line.trim())
  const starts: number[] = []
  for (let i = 0; i + blockLength <= contentLines.length; i += 1) {
    let matched = true
    for (let j = 0; j < blockLength; j += 1) {
      const contentLine = contentLines[i + j]
      if (contentLine === undefined || contentLine.trim() !== trimmedOld[j]) {
        matched = false
        break
      }
    }
    if (matched) starts.push(i)
  }
  return starts
}
