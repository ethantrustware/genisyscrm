import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shell'
import Dashboard from '@/pages/Dashboard'
import Clients from '@/pages/Clients'
import Appointments from '@/pages/Appointments'
import Connect from '@/pages/Connect'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/connect" element={<Connect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
