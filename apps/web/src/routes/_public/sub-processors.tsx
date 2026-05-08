import { createFileRoute } from '@tanstack/react-router'
import { SubProcessorsPage } from '@web/pages/public/legal/sub-processors-page'

export const Route = createFileRoute('/_public/sub-processors')({
  component: SubProcessorsPage,
})
