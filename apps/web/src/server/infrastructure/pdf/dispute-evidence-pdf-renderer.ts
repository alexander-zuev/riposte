import {
  type Color,
  type FontInput,
  layoutText,
  measureText,
  PDF,
  type PDFPage,
} from '@libpdf/core'
import { EvidencePdfRenderError } from '@riposte/core'
import type {
  DisputeEvidencePdfBlock,
  DisputeEvidencePdfDocument,
  DisputeEvidencePdfFact,
  DisputeEvidencePdfImage,
  DisputeEvidencePdfTableColumn,
  DisputeEvidencePdfTableRow,
  DisputeEvidencePdfTimelineItem,
} from '@server/domain/disputes'
import { Result } from 'better-result'

import { createDefaultEvidencePdfAssets, type EvidencePdfAssets } from './pdf-assets'
import {
  EVIDENCE_PDF_FONT as FONT,
  EVIDENCE_PDF_PAGE as PAGE,
  EVIDENCE_PDF_SPACE as SPACE,
  EVIDENCE_PDF_TYPE as TYPE,
  type EvidencePdfTheme,
  evidencePdfTheme,
  STRIPE_DISPUTE_EVIDENCE_MAX_PAGES,
  STRIPE_DISPUTE_EVIDENCE_RECOMMENDED_MAX_BYTES,
} from './pdf-theme'
import type { PdfIconName } from './phosphor-paths'

export type DisputeEvidencePdfBranding = {
  merchantName: string
  primaryColor?: string
}

export type RenderDisputeEvidencePdfInput = {
  document: DisputeEvidencePdfDocument
  branding: DisputeEvidencePdfBranding
  generatedAt: Date
  constraints?: Partial<DisputeEvidencePdfRenderConstraints>
}

export type DisputeEvidencePdfRenderConstraints = {
  maxPages: number
  maxBytes: number
}

type RenderContext = {
  pdf: PDF
  page: PDFPage
  pageNumber: number
  y: number
  branding: DisputeEvidencePdfBranding
  generatedAt: Date
  theme: EvidencePdfTheme
  assets: EvidencePdfAssets
}

export async function renderDisputeEvidencePdf(
  input: RenderDisputeEvidencePdfInput,
): Promise<Result<Uint8Array, EvidencePdfRenderError>> {
  const validatedDocument = validateEvidencePdfDocument(input.document)
  if (validatedDocument.isErr()) return Result.err(validatedDocument.error)

  const rendered = await Result.tryPromise({
    try: () => renderDisputeEvidencePdfUnsafe(input),
    catch: (cause) => new EvidencePdfRenderError({ reason: 'render_failed', cause }),
  })
  if (rendered.isErr()) return Result.err(rendered.error)

  return rendered.value
}

function validateEvidencePdfDocument(
  document: DisputeEvidencePdfDocument,
): Result<void, EvidencePdfRenderError> {
  const issues: { path: string; message: string }[] = []

  requireText(issues, 'title', document.title)
  requireText(issues, 'subtitle', document.subtitle)
  requireText(issues, 'finding.value', document.finding.value)

  if (document.sections.length === 0) {
    issues.push({ path: 'sections', message: 'At least one section is required' })
  }

  for (let sectionIndex = 0; sectionIndex < document.sections.length; sectionIndex += 1) {
    const section = document.sections[sectionIndex]
    if (!section) continue

    requireText(issues, `sections.${sectionIndex}.heading`, section.heading)
    if (section.blocks.length === 0) {
      issues.push({
        path: `sections.${sectionIndex}.blocks`,
        message: 'At least one block is required',
      })
    }

    for (let blockIndex = 0; blockIndex < section.blocks.length; blockIndex += 1) {
      const block = section.blocks[blockIndex]
      if (!block) continue

      validateEvidencePdfBlock(issues, `sections.${sectionIndex}.blocks.${blockIndex}`, block)
    }
  }

  if (issues.length > 0) {
    return Result.err(new EvidencePdfRenderError({ reason: 'invalid_document', issues }))
  }

  return Result.ok(undefined)
}

function validateEvidencePdfBlock(
  issues: { path: string; message: string }[],
  path: string,
  block: DisputeEvidencePdfBlock,
): void {
  switch (block.kind) {
    case 'callout':
      requireText(issues, `${path}.body`, block.body)
      break
    case 'key_value_grid':
      if (block.items.length === 0) {
        issues.push({ path: `${path}.items`, message: 'At least one item is required' })
      }
      for (let itemIndex = 0; itemIndex < block.items.length; itemIndex += 1) {
        const item = block.items[itemIndex]
        if (!item) continue

        requireText(issues, `${path}.items.${itemIndex}.label`, item.label)
      }
      break
    case 'timeline':
      if (block.items.length === 0) {
        issues.push({ path: `${path}.items`, message: 'At least one item is required' })
      }
      for (let itemIndex = 0; itemIndex < block.items.length; itemIndex += 1) {
        const item = block.items[itemIndex]
        if (!item) continue

        requireText(issues, `${path}.items.${itemIndex}.label`, item.label)
      }
      break
    case 'table':
      if (block.rows.length > 0 && block.columns.length === 0) {
        issues.push({ path: `${path}.columns`, message: 'Columns are required when rows exist' })
      }
      for (let columnIndex = 0; columnIndex < block.columns.length; columnIndex += 1) {
        const column = block.columns[columnIndex]
        if (!column) continue

        requireText(issues, `${path}.columns.${columnIndex}.key`, column.key)
        requireText(issues, `${path}.columns.${columnIndex}.label`, column.label)
      }
      break
    case 'image_grid':
      for (let imageIndex = 0; imageIndex < block.images.length; imageIndex += 1) {
        const image = block.images[imageIndex]
        if (!image) continue

        requireText(issues, `${path}.images.${imageIndex}.label`, image.label)
        requireText(issues, `${path}.images.${imageIndex}.alt`, image.alt)
      }
      break
    case 'text':
      requireText(issues, `${path}.body`, block.body)
      break
    default:
      block satisfies never
      issues.push({ path, message: 'Unsupported block kind' })
  }
}

function requireText(
  issues: { path: string; message: string }[],
  path: string,
  value: string,
): void {
  if (value.trim()) return
  issues.push({ path, message: 'Required text is missing' })
}

async function renderDisputeEvidencePdfUnsafe(
  input: RenderDisputeEvidencePdfInput,
): Promise<Result<Uint8Array, EvidencePdfRenderError>> {
  const constraints = resolveRenderConstraints(input.constraints)
  const pdf = PDF.create()
  pdf.setTitle(input.document.title)
  pdf.setAuthor(input.branding.merchantName)
  pdf.setSubject('Stripe dispute evidence packet')
  pdf.setCreator('Riposte')
  pdf.setProducer('Riposte Evidence PDF Renderer')
  pdf.setCreationDate(input.generatedAt)
  pdf.setModificationDate(input.generatedAt)

  const theme = evidencePdfTheme(input.branding.primaryColor)
  const assets = createDefaultEvidencePdfAssets()
  const context = addPage({
    pdf,
    pageNumber: 1,
    branding: input.branding,
    generatedAt: input.generatedAt,
    theme,
    assets,
  })

  drawReportHeader(context, input.document)

  for (const section of input.document.sections) {
    ensureSpace(context, 88)
    drawSectionHeading(context, section.heading)

    for (const block of section.blocks) {
      drawBlock(context, block)
    }

    context.y -= SPACE.sectionAfter
  }

  const pageCount = pdf.getPageCount()
  if (pageCount > constraints.maxPages) {
    return Result.err(
      new EvidencePdfRenderError({
        reason: 'page_limit_exceeded',
        actual: pageCount,
        limit: constraints.maxPages,
      }),
    )
  }

  const bytes = await pdf.save({
    compressStreams: true,
    compressionThreshold: 0,
    subsetFonts: true,
  })

  if (bytes.byteLength > constraints.maxBytes) {
    return Result.err(
      new EvidencePdfRenderError({
        reason: 'byte_limit_exceeded',
        actual: bytes.byteLength,
        limit: constraints.maxBytes,
      }),
    )
  }

  return Result.ok(bytes)
}

function resolveRenderConstraints(
  constraints: Partial<DisputeEvidencePdfRenderConstraints> | undefined,
): DisputeEvidencePdfRenderConstraints {
  const resolved = {
    maxPages: constraints?.maxPages ?? STRIPE_DISPUTE_EVIDENCE_MAX_PAGES,
    maxBytes: constraints?.maxBytes ?? STRIPE_DISPUTE_EVIDENCE_RECOMMENDED_MAX_BYTES,
  }

  if (!Number.isInteger(resolved.maxPages) || resolved.maxPages <= 0) {
    throw new Error('Evidence PDF maxPages constraint must be a positive integer')
  }
  if (!Number.isInteger(resolved.maxBytes) || resolved.maxBytes <= 0) {
    throw new Error('Evidence PDF maxBytes constraint must be a positive integer')
  }

  return resolved
}

function addPage(input: {
  pdf: PDF
  pageNumber: number
  branding: DisputeEvidencePdfBranding
  generatedAt: Date
  theme: EvidencePdfTheme
  assets: EvidencePdfAssets
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
    assets: input.assets,
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
  page.drawText(document.subtitle, {
    x: PAGE.marginX + 42,
    y: cardY + headerHeight - 50,
    font: FONT.body,
    size: TYPE.subtitle,
    color: theme.accent,
  })
  drawFindingBadge(
    context,
    PAGE.width - PAGE.marginX - 158,
    cardY + headerHeight - 38,
    document.finding.value,
  )

  context.y -= headerHeight + SPACE.headerAfter
}

function drawFindingBadge(context: RenderContext, x: number, y: number, label: string): void {
  const { page, theme } = context
  const width = 158
  const height = 24

  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: theme.accentSurface,
    borderColor: theme.border,
    borderWidth: 0.5,
    cornerRadius: 12,
  })
  const displayLabel = fitSingleLine(label, FONT.bold, TYPE.small, width - 18)
  const textWidth = measureText(displayLabel, FONT.bold, TYPE.small)
  page.drawText(displayLabel, {
    x: x + (width - textWidth) / 2,
    y: y + 7,
    font: FONT.bold,
    size: TYPE.small,
    color: theme.accent,
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

function drawBlock(context: RenderContext, block: DisputeEvidencePdfBlock): void {
  switch (block.kind) {
    case 'callout':
      drawCallout(context, block)
      break
    case 'key_value_grid':
      drawKeyValueGrid(context, block.items, block.columns)
      break
    case 'timeline':
      drawTimeline(context, block.items)
      break
    case 'table':
      drawTable(context, block.columns, block.rows)
      break
    case 'image_grid':
      drawImageGrid(context, block.title, block.images)
      break
    case 'text':
      drawTextBlock(context, block.body)
      break
    default:
      block satisfies never
      throw new Error('Unsupported evidence PDF block')
  }

  context.y -= SPACE.blockAfter
}

function drawCallout(
  context: RenderContext,
  block: Extract<DisputeEvidencePdfBlock, { kind: 'callout' }>,
): void {
  const paddingX = 12
  const paddingY = 10
  const bodyWidth = PAGE.contentWidth - paddingX * 2
  const titleLines = block.title
    ? layoutText(block.title, FONT.bold, TYPE.body, bodyWidth, SPACE.rowLineHeight).lines
    : []
  const bodyLines = layoutText(
    block.body,
    FONT.body,
    TYPE.body,
    bodyWidth,
    SPACE.rowLineHeight,
  ).lines
  const titleHeight = titleLines.length * SPACE.rowLineHeight
  const titleGap = titleLines.length > 0 ? 4 : 0
  const bodyHeight = bodyLines.length * SPACE.rowLineHeight
  const height = Math.max(34, paddingY * 2 + titleHeight + titleGap + bodyHeight)

  ensureSpace(context, height + 4)

  const tone = calloutTone(context.theme, block.tone)
  const y = context.y - height
  context.page.drawRectangle({
    x: PAGE.marginX,
    y,
    width: PAGE.contentWidth,
    height,
    color: tone.surface,
    borderColor: tone.border,
    borderWidth: 0.6,
    cornerRadius: 6,
  })

  let textY = context.y - paddingY - TYPE.body
  for (const line of titleLines) {
    context.page.drawText(line.text, {
      x: PAGE.marginX + paddingX,
      y: textY,
      font: FONT.bold,
      size: TYPE.body,
      color: tone.text,
    })
    textY -= SPACE.rowLineHeight
  }
  if (titleGap) textY -= titleGap
  for (const line of bodyLines) {
    context.page.drawText(line.text, {
      x: PAGE.marginX + paddingX,
      y: textY,
      font: FONT.body,
      size: TYPE.body,
      color: context.theme.text,
    })
    textY -= SPACE.rowLineHeight
  }

  context.y = y
}

function drawKeyValueGrid(
  context: RenderContext,
  items: DisputeEvidencePdfFact[],
  columns: 2 | 3,
): void {
  if (items.length === 0) {
    drawCallout(context, {
      kind: 'callout',
      tone: 'warning',
      body: 'Missing evidence: no facts provided for this section',
    })
    return
  }

  const gap = 10
  const cardWidth = (PAGE.contentWidth - gap * (columns - 1)) / columns
  const paddingX = 10
  const paddingY = 9

  for (let index = 0; index < items.length; index += columns) {
    const row = items.slice(index, index + columns)
    const measured = row.map((item) => {
      const valueFont = isSystemValue(item.value) ? FONT.mono : FONT.body
      const valueLines = layoutText(
        item.value || 'Not provided',
        valueFont,
        TYPE.body,
        cardWidth - paddingX * 2,
        SPACE.rowLineHeight,
      ).lines
      return {
        item,
        valueFont,
        valueLines,
        height: Math.max(56, paddingY * 2 + 12 + 5 + valueLines.length * SPACE.rowLineHeight),
      }
    })
    const rowHeight = Math.max(...measured.map((item) => item.height))

    ensureSpace(context, rowHeight + 4)

    const y = context.y - rowHeight
    for (let columnIndex = 0; columnIndex < measured.length; columnIndex += 1) {
      const cell = measured[columnIndex]
      if (!cell) continue

      const x = PAGE.marginX + columnIndex * (cardWidth + gap)
      context.page.drawRectangle({
        x,
        y,
        width: cardWidth,
        height: rowHeight,
        color: context.theme.surface,
        borderColor: context.theme.border,
        borderWidth: 0.5,
        cornerRadius: 5,
      })
      context.page.drawText(cell.item.label, {
        x: x + paddingX,
        y: context.y - paddingY - 10,
        font: FONT.bold,
        size: TYPE.small,
        color: context.theme.muted,
      })

      let lineY = context.y - paddingY - 28
      for (const line of cell.valueLines) {
        context.page.drawText(line.text, {
          x: x + paddingX,
          y: lineY,
          font: cell.valueFont,
          size: TYPE.body,
          color: valueColor(context, cell.item.value),
        })
        lineY -= SPACE.rowLineHeight
      }
    }

    context.y = y - 8
  }
}

function drawTextBlock(context: RenderContext, body: string): void {
  const lines = layoutText(body, FONT.body, TYPE.body, PAGE.contentWidth, SPACE.rowLineHeight).lines
  const blockHeight = Math.max(24, lines.length * SPACE.rowLineHeight + SPACE.rowPaddingY)

  ensureSpace(context, blockHeight + 6)

  let lineY = context.y - SPACE.rowTextOffset
  for (const line of lines) {
    context.page.drawText(line.text, {
      x: PAGE.marginX,
      y: lineY,
      font: FONT.body,
      size: TYPE.body,
      color: context.theme.text,
    })
    lineY -= SPACE.rowLineHeight
  }

  context.y -= blockHeight
}

function drawTimeline(context: RenderContext, items: DisputeEvidencePdfTimelineItem[]): void {
  if (items.length === 0) {
    drawCallout(context, {
      kind: 'callout',
      tone: 'warning',
      body: 'Missing evidence: no timeline events provided',
    })
    return
  }

  const railX = PAGE.marginX + 6
  const bodyX = PAGE.marginX + 24
  const bodyWidth = PAGE.contentWidth - 24

  for (const [index, item] of items.entries()) {
    const valueLines = layoutText(
      item.value,
      isSystemValue(item.value) ? FONT.mono : FONT.body,
      TYPE.body,
      bodyWidth,
      SPACE.rowLineHeight,
    ).lines
    const height = Math.max(42, 18 + valueLines.length * SPACE.rowLineHeight + 12)

    ensureSpace(context, height + 4)

    const top = context.y
    const bottom = top - height
    if (index < items.length - 1) {
      context.page.drawLine({
        start: { x: railX, y: top - 12 },
        end: { x: railX, y: bottom + 2 },
        color: context.theme.border,
        thickness: 0.8,
      })
    }
    context.page.drawCircle({
      x: railX,
      y: top - 10,
      radius: 3.5,
      color: context.theme.accent,
    })
    context.page.drawText(item.label, {
      x: bodyX,
      y: top - 13,
      font: FONT.bold,
      size: TYPE.body,
      color: context.theme.text,
    })

    let lineY = top - 30
    const valueFont = isSystemValue(item.value) ? FONT.mono : FONT.body
    for (const line of valueLines) {
      context.page.drawText(line.text, {
        x: bodyX,
        y: lineY,
        font: valueFont,
        size: TYPE.body,
        color: valueColor(context, item.value),
      })
      lineY -= SPACE.rowLineHeight
    }

    context.y = bottom
  }
}

function drawTable(
  context: RenderContext,
  columns: DisputeEvidencePdfTableColumn[],
  rows: DisputeEvidencePdfTableRow[],
): void {
  if (columns.length === 0 || rows.length === 0) {
    drawCallout(context, {
      kind: 'callout',
      tone: 'warning',
      body: 'Missing evidence: no table data provided',
    })
    return
  }

  const columnWidth = PAGE.contentWidth / columns.length
  drawTableHeader(context, columns, columnWidth)

  for (const row of rows) {
    const measuredCells = columns.map(
      (column) =>
        layoutText(row[column.key] ?? '', FONT.body, TYPE.small, columnWidth - 12, 12).lines,
    )
    const rowHeight = Math.max(
      28,
      16 + Math.max(...measuredCells.map((lines) => lines.length)) * 12,
    )

    if (context.y - rowHeight < PAGE.contentBottom) {
      const next = addPage({
        pdf: context.pdf,
        pageNumber: context.pageNumber + 1,
        branding: context.branding,
        generatedAt: context.generatedAt,
        theme: context.theme,
        assets: context.assets,
      })
      context.page = next.page
      context.pageNumber = next.pageNumber
      context.y = next.y
      drawTableHeader(context, columns, columnWidth)
    }

    const y = context.y - rowHeight
    context.page.drawRectangle({
      x: PAGE.marginX,
      y,
      width: PAGE.contentWidth,
      height: rowHeight,
      borderColor: context.theme.border,
      borderWidth: 0.4,
    })

    for (let index = 0; index < columns.length; index += 1) {
      const x = PAGE.marginX + index * columnWidth
      if (index > 0) {
        context.page.drawLine({
          start: { x, y },
          end: { x, y: y + rowHeight },
          color: context.theme.border,
          thickness: 0.3,
        })
      }

      let lineY = context.y - 14
      for (const line of measuredCells[index] ?? []) {
        context.page.drawText(line.text, {
          x: x + 6,
          y: lineY,
          font: FONT.body,
          size: TYPE.small,
          color: context.theme.text,
        })
        lineY -= 12
      }
    }

    context.y = y
  }
}

function drawTableHeader(
  context: RenderContext,
  columns: DisputeEvidencePdfTableColumn[],
  columnWidth: number,
): void {
  const height = 24
  ensureSpace(context, height + 10)

  const y = context.y - height
  context.page.drawRectangle({
    x: PAGE.marginX,
    y,
    width: PAGE.contentWidth,
    height,
    color: context.theme.surface,
    borderColor: context.theme.border,
    borderWidth: 0.5,
  })

  for (let index = 0; index < columns.length; index += 1) {
    const x = PAGE.marginX + index * columnWidth
    context.page.drawText(columns[index]?.label ?? '', {
      x: x + 6,
      y: context.y - 15,
      font: FONT.bold,
      size: TYPE.small,
      color: context.theme.muted,
    })
  }

  context.y = y
}

function drawImageGrid(
  context: RenderContext,
  title: string | undefined,
  images: DisputeEvidencePdfImage[],
): void {
  if (title) {
    ensureSpace(context, 34)
    context.page.drawText(title, {
      x: PAGE.marginX,
      y: context.y - 4,
      font: FONT.bold,
      size: TYPE.body,
      color: context.theme.text,
    })
    context.y -= 24
  }

  if (images.length === 0) {
    drawCallout(context, {
      kind: 'callout',
      tone: 'warning',
      body: 'Missing evidence: product-specific delivered output images or files',
    })
    return
  }

  const columns = 2
  const gap = 10
  const cardWidth = (PAGE.contentWidth - gap) / columns
  const cardHeight = 116

  for (let index = 0; index < images.length; index += columns) {
    const row = images.slice(index, index + columns)
    ensureSpace(context, cardHeight + 8)

    const y = context.y - cardHeight
    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      const image = row[columnIndex]
      if (!image) continue

      const x = PAGE.marginX + columnIndex * (cardWidth + gap)
      context.page.drawRectangle({
        x,
        y,
        width: cardWidth,
        height: cardHeight,
        color: context.theme.surface,
        borderColor: context.theme.border,
        borderWidth: 0.5,
        cornerRadius: 5,
      })
      drawIconOnTextBaseline(context, 'imageSquare', {
        x: x + 10,
        baselineY: context.y - 22,
        size: 14,
      })
      context.page.drawText(fitSingleLine(image.label, FONT.bold, TYPE.body, cardWidth - 42), {
        x: x + 30,
        y: context.y - 24,
        font: FONT.bold,
        size: TYPE.body,
        color: context.theme.text,
      })

      const details = [
        image.caption,
        image.objectKey ? `${image.source}: ${image.objectKey}` : `${image.source}: pending`,
        image.alt,
      ].filter((value): value is string => Boolean(value?.trim()))
      const lines = layoutText(details.join('\n'), FONT.body, TYPE.small, cardWidth - 20, 12).lines
      let lineY = context.y - 46
      for (const line of lines.slice(0, 5)) {
        context.page.drawText(line.text, {
          x: x + 10,
          y: lineY,
          font: FONT.body,
          size: TYPE.small,
          color: context.theme.muted,
        })
        lineY -= 12
      }
    }

    context.y = y - 8
  }
}

function drawIconOnTextBaseline(
  context: RenderContext,
  icon: PdfIconName,
  at: { x: number; baselineY: number; size: number },
): void {
  const visualTopY = at.baselineY + at.size * 0.95

  context.page.drawSvgPath(context.assets.icons[icon], {
    x: at.x,
    y: visualTopY,
    scale: at.size / 256,
    color: context.theme.muted,
  })
}

function calloutTone(
  theme: EvidencePdfTheme,
  tone: Extract<DisputeEvidencePdfBlock, { kind: 'callout' }>['tone'],
): { surface: Color; border: Color; text: Color } {
  switch (tone) {
    case 'strong':
      return { surface: theme.strongSurface, border: theme.strong, text: theme.strong }
    case 'warning':
      return { surface: theme.warningSurface, border: theme.warning, text: theme.warning }
    case 'neutral':
      return { surface: theme.accentSurface, border: theme.border, text: theme.accent }
    default:
      tone satisfies never
      return { surface: theme.surface, border: theme.border, text: theme.text }
  }
}

function valueColor(context: RenderContext, value: string): Color {
  return value.startsWith('Missing evidence:') ? context.theme.warning : context.theme.text
}

function sectionIconForHeading(heading: string): PdfIconName {
  switch (heading) {
    case 'Executive Summary':
      return 'shield'
    case 'Customer & Payment Match':
      return 'userCheck'
    case 'Authorization Signals':
      return 'shieldCheck'
    case 'Digital Product Delivered':
      return 'downloadSimple'
    case 'Usage Timeline':
      return 'clockCounterClockwise'
    case 'Delivered Outputs':
      return 'imageSquare'
    case 'Refunds, Communications & Prior Relationship':
      return 'chatCircleText'
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
    assets: context.assets,
  })

  context.page = next.page
  context.pageNumber = next.pageNumber
  context.y = next.y
}

function fitSingleLine(text: string, font: FontInput, size: number, maxWidth: number): string {
  if (measureText(text, font, size) <= maxWidth) return text

  let fitted = text
  while (fitted.length > 1 && measureText(`${fitted}...`, font, size) > maxWidth) {
    fitted = fitted.slice(0, -1)
  }
  return `${fitted}...`
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
