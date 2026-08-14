import { createFileRoute } from '@tanstack/react-router'
import Settings from '@/pages/Settings'

// URL stays /connect so existing links and bookmarks keep working.
export const Route = createFileRoute('/_app/connect')({
  component: Settings,
})
