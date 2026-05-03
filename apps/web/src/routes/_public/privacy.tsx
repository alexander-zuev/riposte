import { createFileRoute } from '@tanstack/react-router'
import { PrivacyPage } from '@web/pages/public/legal/privacy-page'

export const Route = createFileRoute('/_public/privacy')({
  component: PrivacyPage,
})
