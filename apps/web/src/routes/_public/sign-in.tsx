import { createFileRoute } from '@tanstack/react-router'
import { SignInPage } from '@web/pages/public/sign-in/sign-in-page'

export const Route = createFileRoute('/_public/sign-in')({
  component: SignInPage,
})
