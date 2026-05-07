import {
  ArrowClockwiseIcon,
  HouseIcon,
  QuestionIcon,
  WarningOctagonIcon,
} from '@phosphor-icons/react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FullPageStatus } from '@web/ui/components/layout/full-page-status'
import { Button } from '@web/ui/components/ui/button'

const meta = {
  title: 'Patterns/Error States/Full Page Status',
  component: FullPageStatus,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof FullPageStatus>

export default meta
type Story = StoryObj<typeof meta>

export const NotFound: Story = {
  args: {
    icon: QuestionIcon,
    title: 'Page not found',
    subtitle: 'This page does not exist or has moved',
    actions: (
      <Button type="button">
        <HouseIcon data-icon="inline-start" />
        Go home
      </Button>
    ),
  },
}

export const RouterError: Story = {
  args: {
    icon: WarningOctagonIcon,
    tone: 'destructive',
    role: 'alert',
    title: 'Something went wrong',
    subtitle: 'The page could not finish loading',
    actions: (
      <Button type="button">
        <ArrowClockwiseIcon data-icon="inline-start" />
        Try again
      </Button>
    ),
  },
}

export const SentryBoundaryFallback: Story = {
  args: {
    icon: WarningOctagonIcon,
    tone: 'destructive',
    role: 'alert',
    title: 'Something went wrong',
    subtitle: 'The app hit an unrecoverable error',
    actions: (
      <Button type="button">
        <ArrowClockwiseIcon data-icon="inline-start" />
        Reload
      </Button>
    ),
  },
}
