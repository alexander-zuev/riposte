/**
 * Single source of truth for rendering token counts across the agent feature.
 *  - Under 1k: raw locale-formatted integer ("980")
 *  - 1k – 999k: one decimal, trailing ".0" dropped ("9.7k", "256k")
 *  - 1M+: one decimal in millions ("1.2M")
 */
export function formatTokens(value: number): string {
  if (value < 1000) return value.toLocaleString()
  if (value < 1_000_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
}
