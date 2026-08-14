import { createFileRoute } from '@tanstack/react-router'
import Crm from '@/pages/Crm'

export const Route = createFileRoute('/_app/crm')({
  component: Crm,
})
