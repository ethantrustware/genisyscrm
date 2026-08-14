import { createFileRoute } from '@tanstack/react-router'
import Connect from '@/pages/Connect'

export const Route = createFileRoute('/_app/connect')({
  component: Connect,
})
