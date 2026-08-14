import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '@/components/shell'

/** Layout route — every page renders inside the Hub-styled shell. */
export const Route = createFileRoute('/_app')({
  component: AppShell,
})
