import { createFileRoute } from '@tanstack/react-router'
import { createSeoHead, SITE_NAME } from '@web/lib/seo/seo'
import { TermsPage } from '@web/pages/public/legal/terms-page'

export const Route = createFileRoute('/_public/terms')({
  head: () =>
    createSeoHead({
      title: `Terms of Service | ${SITE_NAME}`,
      description: 'The terms governing your use of Riposte.',
      path: '/terms',
    }),
  component: TermsPage,
})
