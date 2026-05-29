import { createFileRoute } from '@tanstack/react-router'
import { createSeoHead, SITE_NAME } from '@web/lib/seo/seo'
import { SubProcessorsPage } from '@web/pages/public/legal/sub-processors-page'

export const Route = createFileRoute('/_public/sub-processors')({
  head: () =>
    createSeoHead({
      title: `Sub-processors | ${SITE_NAME}`,
      description: 'Third-party sub-processors Riposte uses to deliver the service.',
      path: '/sub-processors',
    }),
  component: SubProcessorsPage,
})
