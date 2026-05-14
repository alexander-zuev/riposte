import { routeErrorMiddleware } from '@server/infrastructure/middleware'
import { devOnlyRequestMiddleware } from '@server/infrastructure/middleware/dev-only.middleware'
import {
  buildDevEvidencePdfPreview,
  DEV_EVIDENCE_PDF_CATEGORIES,
  type DevEvidencePdfCategory,
} from '@server/infrastructure/pdf/dev-dispute-evidence-pdf-fixtures'
import { renderDisputeEvidencePdf } from '@server/infrastructure/pdf/dispute-evidence-pdf-renderer'
import { createFileRoute } from '@tanstack/react-router'

function isDevEvidencePdfCategory(value: string | null): value is DevEvidencePdfCategory {
  return DEV_EVIDENCE_PDF_CATEGORIES.includes(value as DevEvidencePdfCategory)
}

function toResponseArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const body = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(body).set(bytes)

  return body
}

export const Route = createFileRoute('/dev/evidence-packets/pdf')({
  server: {
    middleware: [routeErrorMiddleware, devOnlyRequestMiddleware],
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const categoryParam = url.searchParams.get('category')
        const category = isDevEvidencePdfCategory(categoryParam) ? categoryParam : 'fraudulent'
        const preview = buildDevEvidencePdfPreview(category)

        const rendered = await renderDisputeEvidencePdf({
          document: preview.document,
          branding: preview.branding,
          generatedAt: preview.generatedAt,
        })
        if (rendered.isErr()) {
          return new Response(rendered.error.message, {
            status: 500,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-store',
            },
          })
        }

        return new Response(toResponseArrayBuffer(rendered.value), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="riposte-${category}-evidence.pdf"`,
            'Cache-Control': 'no-store',
          },
        })
      },
    },
  },
})
