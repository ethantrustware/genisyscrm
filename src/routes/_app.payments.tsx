import { createFileRoute } from '@tanstack/react-router'
import Payments from '@/pages/Payments'

export const Route = createFileRoute('/_app/payments')({
  component: Payments,
})
