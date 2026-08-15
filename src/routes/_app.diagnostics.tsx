import { createFileRoute } from '@tanstack/react-router'
import Diagnostics from '@/pages/Diagnostics'

export const Route = createFileRoute('/_app/diagnostics')({
  component: Diagnostics,
})
