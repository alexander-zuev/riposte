import { createFileRoute } from '@tanstack/react-router'
import { TermsPage } from '@web/pages/public/legal/terms-page'

export const Route = createFileRoute('/_public/terms')({
  component: TermsPage,
})
