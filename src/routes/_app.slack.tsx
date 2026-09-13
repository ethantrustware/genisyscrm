import { createFileRoute } from '@tanstack/react-router'
import Slack from '@/pages/Slack'

export const Route = createFileRoute('/_app/slack')({
  component: Slack,
})
