import { createFileRoute } from '@tanstack/react-router'
import Scoreboard from '@/pages/Scoreboard'

export const Route = createFileRoute('/_app/scoreboard')({
  component: Scoreboard,
})
