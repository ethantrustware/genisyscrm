import { createFileRoute } from '@tanstack/react-router'
import Clock from '@/pages/Clock'

export const Route = createFileRoute('/_app/clock')({
  component: Clock,
})
