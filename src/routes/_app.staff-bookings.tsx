import { createFileRoute } from '@tanstack/react-router'
import StaffBookings from '@/pages/StaffBookings'

export const Route = createFileRoute('/_app/staff-bookings')({
  component: StaffBookings,
})
