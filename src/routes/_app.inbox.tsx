import { createFileRoute } from '@tanstack/react-router'
import Inbox from '@/pages/Inbox'

export const Route = createFileRoute('/_app/inbox')({
  component: Inbox,
})
