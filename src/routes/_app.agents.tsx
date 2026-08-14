import { createFileRoute } from '@tanstack/react-router'
import Staff from '@/pages/Staff'

export const Route = createFileRoute('/_app/agents')({
  component: Staff,
})
