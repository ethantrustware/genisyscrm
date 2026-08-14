import { createFileRoute } from '@tanstack/react-router'
import CallCenter from '@/pages/CallCenter'

export const Route = createFileRoute('/_app/call-center')({
  component: CallCenter,
})
