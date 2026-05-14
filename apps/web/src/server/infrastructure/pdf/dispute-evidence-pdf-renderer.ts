import {
  type Color,
  type FontInput,
  layoutText,
  measureText,
  PDF,
  type PDFPage,
  rgb,
  StandardFonts,
} from '@libpdf/core'
import type { DisputeEvidencePdfDocument } from '@server/domain/disputes'

// First-pass renderer scaffold.
// Dirty by design: proves backend PDF generation and Stripe-shaped constraints before the final
// evidence layout, font pipeline, icon system, merchant branding, and packet-specific sections
// are designed properly. This file is up for grabs once the real PDF art direction lands.
export const STRIPE_DISPUTE_EVIDENCE_MAX_PAGES = 50
export const STRIPE_DISPUTE_EVIDENCE_RECOMMENDED_MAX_BYTES = 4_500_000

export type DisputeEvidencePdfBranding = {
  merchantName: string
  primaryColor?: string
}

export type RenderDisputeEvidencePdfInput = {
  document: DisputeEvidencePdfDocument
  branding: DisputeEvidencePdfBranding
  generatedAt: Date
}

type PdfTheme = {
  text: Color
  muted: Color
  border: Color
  surface: Color
  accent: Color
  success: Color
  successSurface: Color
}

type RenderContext = {
  pdf: PDF
  page: PDFPage
  pageNumber: number
  y: number
  branding: DisputeEvidencePdfBranding
  generatedAt: Date
  theme: PdfTheme
}

const PAGE = {
  width: 612,
  height: 792,
  marginX: 42,
  headerTop: 750,
  contentTop: 694,
  footerY: 26,
  contentBottom: 58,
  contentWidth: 528,
}

const FONT = {
  body: StandardFonts.Helvetica,
  bold: StandardFonts.HelveticaBold,
  mono: StandardFonts.Courier,
}

const TYPE = {
  title: 18,
  subtitle: 12,
  section: 13,
  body: 12,
  small: 9,
}

const SPACE = {
  headerAfter: 24,
  sectionBefore: 12,
  headingToRows: 16,
  sectionAfter: 10,
  rowLineOffset: 7,
  rowTextOffset: 12,
  rowLineHeight: 15,
  rowPaddingY: 13,
}

// Phosphor regular path data copied from @phosphor-icons/react. Kept local because this
// backend renderer should not import React component modules just to draw static PDF icons.
const ICONS = {
  checkCircle:
    'M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z',
  creditCard:
    'M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,16V88H32V64Zm0,128H32V104H224v88Zm-16-24a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h32A8,8,0,0,1,208,168Zm-64,0a8,8,0,0,1-8,8H120a8,8,0,0,1,0-16h16A8,8,0,0,1,144,168Z',
  fileText:
    'M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Zm-32-80a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,136Zm0,32a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,168Z',
  handshake:
    'M254.3,107.91,228.78,56.85a16,16,0,0,0-21.47-7.15L182.44,62.13,130.05,48.27a8.14,8.14,0,0,0-4.1,0L73.56,62.13,48.69,49.7a16,16,0,0,0-21.47,7.15L1.7,107.9a16,16,0,0,0,7.15,21.47l27,13.51,55.49,39.63a8.06,8.06,0,0,0,2.71,1.25l64,16a8,8,0,0,0,7.6-2.1l55.07-55.08,26.42-13.21a16,16,0,0,0,7.15-21.46Zm-54.89,33.37L165,113.72a8,8,0,0,0-10.68.61C136.51,132.27,116.66,130,104,122L147.24,80h31.81l27.21,54.41ZM41.53,64,62,74.22,36.43,125.27,16,115.06Zm116,119.13L99.42,168.61l-49.2-35.14,28-56L128,64.28l9.8,2.59-45,43.68-.08.09a16,16,0,0,0,2.72,24.81c20.56,13.13,45.37,11,64.91-5L188,152.66Zm62-57.87-25.52-51L214.47,64,240,115.06Zm-87.75,92.67a8,8,0,0,1-7.75,6.06,8.13,8.13,0,0,1-1.95-.24L80.41,213.33a7.89,7.89,0,0,1-2.71-1.25L51.35,193.26a8,8,0,0,1,9.3-13l25.11,17.94L126,208.24A8,8,0,0,1,131.82,217.94Z',
  receipt:
    'M72,104a8,8,0,0,1,8-8h96a8,8,0,0,1,0,16H80A8,8,0,0,1,72,104Zm8,40h96a8,8,0,0,0,0-16H80a8,8,0,0,0,0,16ZM232,56V208a8,8,0,0,1-11.58,7.15L192,200.94l-28.42,14.21a8,8,0,0,1-7.16,0L128,200.94,99.58,215.15a8,8,0,0,1-7.16,0L64,200.94,35.58,215.15A8,8,0,0,1,24,208V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Zm-16,0H40V195.06l20.42-10.22a8,8,0,0,1,7.16,0L96,199.06l28.42-14.22a8,8,0,0,1,7.16,0L160,199.06l28.42-14.22a8,8,0,0,1,7.16,0L216,195.06Z',
  shield:
    'M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.27,47,25.53a8,8,0,0,0,4.2,0c1-.26,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56,160,0Z',
  shieldCheck:
    'M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.26,47,25.53a8,8,0,0,0,4.2,0c1-.27,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56,160,0ZM82.34,141.66a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32l-56,56a8,8,0,0,1-11.32,0Z',
  user: 'M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z',
} as const

type PdfIconName = keyof typeof ICONS

export async function renderDisputeEvidencePdf(
  input: RenderDisputeEvidencePdfInput,
): Promise<Uint8Array> {
  const pdf = PDF.create()
  pdf.setTitle(input.document.title)
  pdf.setAuthor(input.branding.merchantName)
  pdf.setSubject('Stripe dispute evidence packet')
  pdf.setCreator('Riposte')
  pdf.setProducer('Riposte Evidence PDF Renderer')
  pdf.setCreationDate(input.generatedAt)
  pdf.setModificationDate(input.generatedAt)

  const theme = pdfTheme(input.branding.primaryColor)
  const context = addPage({
    pdf,
    pageNumber: 1,
    branding: input.branding,
    generatedAt: input.generatedAt,
    theme,
  })

  drawReportHeader(context, input.document)

  for (const section of input.document.sections) {
    ensureSpace(context, 88)
    drawSectionHeading(context, section.heading)

    for (const row of section.rows) {
      drawRow(context, row.label, row.value)
    }

    context.y -= SPACE.sectionAfter
  }

  const pageCount = pdf.getPageCount()
  if (pageCount > STRIPE_DISPUTE_EVIDENCE_MAX_PAGES) {
    throw new Error(`Dispute evidence PDF exceeds ${STRIPE_DISPUTE_EVIDENCE_MAX_PAGES} pages`)
  }

  const bytes = await pdf.save({
    compressStreams: true,
    compressionThreshold: 0,
    subsetFonts: true,
  })

  if (bytes.byteLength > STRIPE_DISPUTE_EVIDENCE_RECOMMENDED_MAX_BYTES) {
    throw new Error(
      `Dispute evidence PDF exceeds ${STRIPE_DISPUTE_EVIDENCE_RECOMMENDED_MAX_BYTES} bytes`,
    )
  }

  return bytes
}

function addPage(input: {
  pdf: PDF
  pageNumber: number
  branding: DisputeEvidencePdfBranding
  generatedAt: Date
  theme: PdfTheme
}): RenderContext {
  const page = input.pdf.addPage({ size: 'letter', orientation: 'portrait' })
  const context: RenderContext = {
    pdf: input.pdf,
    page,
    pageNumber: input.pageNumber,
    y: PAGE.contentTop,
    branding: input.branding,
    generatedAt: input.generatedAt,
    theme: input.theme,
  }

  drawPageChrome(context)
  return context
}

function drawPageChrome(context: RenderContext): void {
  const { page, theme } = context

  page.drawText(context.branding.merchantName, {
    x: PAGE.marginX,
    y: PAGE.headerTop,
    font: FONT.bold,
    size: 12,
    color: theme.text,
  })
  page.drawText('Stripe dispute evidence', {
    x: PAGE.width - PAGE.marginX - 145,
    y: PAGE.headerTop,
    font: FONT.body,
    size: 10,
    color: theme.muted,
  })
  page.drawLine({
    start: { x: PAGE.marginX, y: PAGE.headerTop - 18 },
    end: { x: PAGE.width - PAGE.marginX, y: PAGE.headerTop - 18 },
    color: theme.border,
    thickness: 0.6,
  })

  page.drawLine({
    start: { x: PAGE.marginX, y: PAGE.footerY + 14 },
    end: { x: PAGE.width - PAGE.marginX, y: PAGE.footerY + 14 },
    color: theme.border,
    thickness: 0.5,
  })
  page.drawText(`Generated ${formatDateTime(context.generatedAt)}`, {
    x: PAGE.marginX,
    y: PAGE.footerY,
    font: FONT.body,
    size: TYPE.small,
    color: theme.muted,
  })
  page.drawText(`Page ${context.pageNumber}`, {
    x: PAGE.width - PAGE.marginX - 36,
    y: PAGE.footerY,
    font: FONT.body,
    size: TYPE.small,
    color: theme.muted,
  })
}

function drawReportHeader(context: RenderContext, document: DisputeEvidencePdfDocument): void {
  const { page, theme } = context
  const headerHeight = 78
  const cardY = context.y - headerHeight + 10
  const titleBaseline = cardY + headerHeight - 28

  page.drawRectangle({
    x: PAGE.marginX,
    y: cardY,
    width: PAGE.contentWidth,
    height: headerHeight,
    color: theme.surface,
    borderColor: theme.border,
    borderWidth: 0.6,
    cornerRadius: 6,
  })
  drawIconOnTextBaseline(context, 'shieldCheck', {
    x: PAGE.marginX + 16,
    baselineY: titleBaseline,
    size: 16,
  })
  page.drawText(document.title, {
    x: PAGE.marginX + 42,
    y: titleBaseline,
    font: FONT.bold,
    size: TYPE.title,
    color: theme.text,
  })
  page.drawText('Transaction Security Analysis & Verification', {
    x: PAGE.marginX + 42,
    y: cardY + headerHeight - 50,
    font: FONT.body,
    size: TYPE.subtitle,
    color: theme.accent,
  })
  drawStatusBadge(
    context,
    PAGE.width - PAGE.marginX - 142,
    cardY + headerHeight - 38,
    'Verified Legitimate',
  )

  context.y -= headerHeight + SPACE.headerAfter
}

function drawStatusBadge(context: RenderContext, x: number, y: number, label: string): void {
  const { page, theme } = context
  const width = 142
  const height = 24

  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: theme.successSurface,
    borderColor: theme.success,
    borderWidth: 0.5,
    cornerRadius: 12,
  })
  const textWidth = measureText(label, FONT.bold, TYPE.body)
  page.drawText(label, {
    x: x + (width - textWidth) / 2,
    y: y + 6,
    font: FONT.bold,
    size: TYPE.body,
    color: theme.success,
  })
}

function drawSectionHeading(context: RenderContext, heading: string): void {
  context.y -= SPACE.sectionBefore
  drawIconOnTextBaseline(context, sectionIconForHeading(heading), {
    x: PAGE.marginX,
    baselineY: context.y,
    size: 12,
  })
  context.page.drawText(heading, {
    x: PAGE.marginX + 22,
    y: context.y,
    font: FONT.bold,
    size: TYPE.section,
    color: context.theme.text,
  })
  context.y -= SPACE.headingToRows
}

function drawRow(context: RenderContext, label: string, value: string): void {
  const labelWidth = 144
  const gap = 16
  const valueWidth = PAGE.contentWidth - labelWidth - gap
  const valueFont = isSystemValue(value) ? FONT.mono : FONT.body
  const valueLines = layoutText(
    value || 'Not provided',
    valueFont,
    TYPE.body,
    valueWidth,
    SPACE.rowLineHeight,
  ).lines
  const rowHeight = Math.max(26, valueLines.length * SPACE.rowLineHeight + SPACE.rowPaddingY)

  ensureSpace(context, rowHeight + 6)

  const top = context.y
  context.page.drawLine({
    start: { x: PAGE.marginX, y: top + SPACE.rowLineOffset },
    end: { x: PAGE.width - PAGE.marginX, y: top + SPACE.rowLineOffset },
    color: context.theme.border,
    thickness: 0.4,
  })
  context.page.drawText(label, {
    x: PAGE.marginX,
    y: top - SPACE.rowTextOffset,
    font: FONT.bold,
    size: TYPE.body,
    color: context.theme.muted,
  })

  let lineY = top - SPACE.rowTextOffset
  for (const line of valueLines) {
    context.page.drawText(line.text, {
      x: PAGE.marginX + labelWidth + gap,
      y: lineY,
      font: valueFont,
      size: TYPE.body,
      color: context.theme.text,
    })
    lineY -= SPACE.rowLineHeight
  }

  context.y -= rowHeight
}

function drawIconOnTextBaseline(
  context: RenderContext,
  icon: PdfIconName,
  at: { x: number; baselineY: number; size: number },
): void {
  const visualTopY = at.baselineY + at.size * 0.95

  context.page.drawSvgPath(ICONS[icon], {
    x: at.x,
    y: visualTopY,
    scale: at.size / 256,
    color: context.theme.muted,
  })
}

function sectionIconForHeading(heading: string): PdfIconName {
  switch (heading) {
    case 'Investigation Summary':
      return 'shield'
    case 'Transaction Details':
      return 'receipt'
    case 'Payment Method Verification':
      return 'creditCard'
    case 'Customer Verification':
      return 'user'
    case 'Prior Relationship':
      return 'handshake'
    case 'Investigation Conclusion':
      return 'checkCircle'
    default:
      return 'fileText'
  }
}

function ensureSpace(context: RenderContext, requiredHeight: number): void {
  if (context.y - requiredHeight >= PAGE.contentBottom) return

  const next = addPage({
    pdf: context.pdf,
    pageNumber: context.pageNumber + 1,
    branding: context.branding,
    generatedAt: context.generatedAt,
    theme: context.theme,
  })

  context.page = next.page
  context.pageNumber = next.pageNumber
  context.y = next.y
}

function pdfTheme(primaryColor?: string): PdfTheme {
  return {
    text: hex('#111827'),
    muted: hex('#6B7280'),
    border: hex('#D7DEE8'),
    surface: hex('#F8FAFC'),
    accent: primaryColor ? hex(primaryColor) : hex('#2563EB'),
    success: hex('#16A34A'),
    successSurface: hex('#ECFDF3'),
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

function isSystemValue(value: string): boolean {
  return (
    /^(?:du_|ch_|pi_|pm_|cus_|evt_)[A-Za-z0-9_]+$/.test(value) ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)
  )
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date)
}

export function estimateTextWidth(text: string, font: FontInput, size: number): number {
  return measureText(text, font, size)
}
