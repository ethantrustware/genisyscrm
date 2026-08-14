import { createFileRoute } from '@tanstack/react-router'
import Appointments from '@/pages/Appointments'

export const Route = createFileRoute('/_app/appointments')({
  component: Appointments,
})
