import { createFileRoute } from '@tanstack/react-router'
import { createSeoHead, SITE_NAME } from '@web/lib/seo/seo'
import { PrivacyPage } from '@web/pages/public/legal/privacy-page'

export const Route = createFileRoute('/_public/privacy')({
  head: () =>
    createSeoHead({
      title: `Privacy Policy | ${SITE_NAME}`,
      description: 'How Riposte collects, uses, and protects your data.',
      path: '/privacy',
    }),
  component: PrivacyPage,
})
