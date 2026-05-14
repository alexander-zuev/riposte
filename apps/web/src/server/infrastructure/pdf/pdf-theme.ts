import { type Color, rgb, StandardFonts } from '@libpdf/core'

export const STRIPE_DISPUTE_EVIDENCE_MAX_PAGES = 50
export const STRIPE_DISPUTE_EVIDENCE_RECOMMENDED_MAX_BYTES = 4_500_000

export type EvidencePdfTheme = {
  text: Color
  muted: Color
  border: Color
  surface: Color
  accent: Color
  accentSurface: Color
  strong: Color
  strongSurface: Color
  warning: Color
  warningSurface: Color
}

// Stage 2 extraction only: these values preserve the rough renderer's current layout.
// Stage 5 owns the intentional typography, spacing, and page-system redesign.
export const EVIDENCE_PDF_PAGE = {
  width: 612,
  height: 792,
  marginX: 42,
  headerTop: 750,
  contentTop: 694,
  footerY: 26,
  contentBottom: 58,
  contentWidth: 528,
} as const

// Standard PDF fonts keep the first renderer dependency-free. Inter and JetBrains Mono are
// planned as explicit embedded assets once the renderer asset service lands.
export const EVIDENCE_PDF_FONT = {
  body: StandardFonts.Helvetica,
  bold: StandardFonts.HelveticaBold,
  mono: StandardFonts.Courier,
} as const

// Temporary type scale from the first-pass renderer.
export const EVIDENCE_PDF_TYPE = {
  title: 18,
  subtitle: 12,
  section: 13,
  body: 12,
  small: 9,
} as const

// Temporary spacing tokens from the first-pass row renderer.
export const EVIDENCE_PDF_SPACE = {
  headerAfter: 24,
  sectionBefore: 12,
  headingToRows: 16,
  sectionAfter: 10,
  blockAfter: 10,
  rowLineOffset: 7,
  rowTextOffset: 12,
  rowLineHeight: 15,
  rowPaddingY: 13,
} as const

export function evidencePdfTheme(primaryColor?: string): EvidencePdfTheme {
  return {
    text: hex('#111827'),
    muted: hex('#6B7280'),
    border: hex('#D7DEE8'),
    surface: hex('#F8FAFC'),
    accent: primaryColor ? hex(primaryColor) : hex('#2563EB'),
    accentSurface: hex('#EFF6FF'),
    strong: hex('#047857'),
    strongSurface: hex('#ECFDF5'),
    warning: hex('#B45309'),
    warningSurface: hex('#FFFBEB'),
  }
}

function hex(value: string): Color {
  const normalized = value.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return rgb(0.15, 0.39, 0.92)

  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255
  return rgb(r, g, b)
}
