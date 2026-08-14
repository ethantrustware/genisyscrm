import { useEffect, useState } from 'react'

/**
 * Client for the Hub's external API.
 *
 * Two modes, deliberately:
 *
 *  - **Demo** (default): returns realistic mock data. This is what
 *    Lovable's preview shows, so the UI can be designed and iterated on
 *    with no credentials and no risk. Ethan never needs a token.
 *
 *  - **Live**: when someone enters a Hub URL + API token on the Connect
 *    screen, every fetch hits the real /api/external/v1 surface.
 *
 * The token lives in localStorage and is NEVER committed or bundled —
 * this repo is public, so a token in source would be a token published
 * to the world. It is entered at runtime, per browser.
 */

const LS_BASE = 'genisys.apiBase'
const LS_TOKEN = 'genisys.apiToken'

export const DEFAULT_HUB = 'https://genisys-hub.onrender.com'

export type Connection = { base: string; token: string } | null

export function getConnection(): Connection {
  try {
    const base = localStorage.getItem(LS_BASE)
    const token = localStorage.getItem(LS_TOKEN)
    if (base && token) return { base, token }
  } catch {
    /* localStorage unavailable (SSR/sandbox) — fall through to demo */
  }
  return null
}

export function setConnection(base: string, token: string) {
  localStorage.setItem(LS_BASE, base.replace(/\/+$/, ''))
  localStorage.setItem(LS_TOKEN, token.trim())
}

export function clearConnection() {
  localStorage.removeItem(LS_BASE)
  localStorage.removeItem(LS_TOKEN)
}

export function isLive(): boolean {
  return getConnection() !== null
}

/**
 * SSR-safe version of isLive().
 *
 * TanStack Start renders this app on the server, where localStorage
 * doesn't exist — so the server always produces the demo state. Reading
 * storage during the first client render instead would disagree with
 * that markup and trigger a hydration mismatch, so we correct in an
 * effect after mount.
 */
export function useIsLive(): boolean {
  const [live, setLive] = useState(false)
  useEffect(() => setLive(isLive()), [])
  return live
}

/* -------------------------------------------------------------------------- */
/*  Types — mirror /api/external/v1 responses                                 */
/* -------------------------------------------------------------------------- */

export type Stats = {
  activeClients: number
  totalAppointments: number
  appointmentsThisWeek: number
  upcomingAppointments: number
  byStatus: Array<{ status: string; count: number }>
}

export type Client = {
  id: string
  name: string
  state: string | null
  color: string
  active: boolean
  contactName: string | null
  contactRole: string | null
  contactEmail: string | null
  contactPhone: string | null
  appointmentCount: number
  createdAt: string
}

export type Appointment = {
  id: string
  apptDateTime: string
  customerName: string
  customerPhone: string | null
  email: string | null
  address: string | null
  county: string | null
  status: string
  dispatchStatus: string
  monthlyBill: string | null
  utilityProvider: string | null
  clientName: string | null
  clientColor: string | null
  agentName: string | null
  createdAt: string
}

/* -------------------------------------------------------------------------- */
/*  Transport                                                                 */
/* -------------------------------------------------------------------------- */

export class ApiError extends Error {}

async function get<T>(path: string): Promise<T> {
  const conn = getConnection()
  if (!conn) throw new ApiError('not connected')

  const res = await fetch(`${conn.base}/api/external/v1${path}`, {
    headers: { Authorization: `Bearer ${conn.token}` },
  })

  if (res.status === 401) {
    throw new ApiError('Token rejected. Check it on the Connect screen.')
  }
  if (!res.ok) {
    throw new ApiError(`Hub returned ${res.status}`)
  }
  const body = (await res.json()) as { ok: boolean; data: T }
  return body.data
}

/** Verify a URL + token pair before saving it. */
export async function testConnection(
  base: string,
  token: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(
      `${base.replace(/\/+$/, '')}/api/external/v1/me`,
      { headers: { Authorization: `Bearer ${token.trim()}` } },
    )
    if (res.status === 401) {
      return { ok: false, message: 'Token rejected — check it and try again.' }
    }
    if (!res.ok) {
      return { ok: false, message: `Hub returned ${res.status}.` }
    }
    const body = (await res.json()) as { data?: { tokenName?: string } }
    return {
      ok: true,
      message: `Connected as "${body.data?.tokenName ?? 'token'}".`,
    }
  } catch {
    return {
      ok: false,
      message:
        'Could not reach the Hub. Check the URL, and that this origin is allowed by CORS.',
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Fetchers — live when connected, mock otherwise                            */
/* -------------------------------------------------------------------------- */

export async function fetchStats(): Promise<Stats> {
  if (!isLive()) return MOCK_STATS
  return get<Stats>('/stats')
}

export async function fetchClients(): Promise<Client[]> {
  if (!isLive()) return MOCK_CLIENTS
  return get<Client[]>('/clients')
}

export async function fetchAppointments(): Promise<Appointment[]> {
  if (!isLive()) return MOCK_APPOINTMENTS
  return get<Appointment[]>('/appointments?limit=50')
}

/* -------------------------------------------------------------------------- */
/*  Mock data — shaped exactly like the real payloads                         */
/* -------------------------------------------------------------------------- */

const MOCK_STATS: Stats = {
  activeClients: 4,
  totalAppointments: 312,
  appointmentsThisWeek: 18,
  upcomingAppointments: 27,
  byStatus: [
    { status: 'booked', count: 96 },
    { status: 'showed', count: 121 },
    { status: 'no_show', count: 44 },
    { status: 'cancelled', count: 31 },
    { status: 'won', count: 20 },
  ],
}

const MOCK_CLIENTS: Client[] = [
  {
    id: 'c1',
    name: 'Brighton Solar',
    state: 'Arizona',
    color: '#3b82f6',
    active: true,
    contactName: 'David Mehta',
    contactRole: 'VP Revenue',
    contactEmail: 'david@brightonsolar.example',
    contactPhone: '(602) 555-0142',
    appointmentCount: 128,
    createdAt: '2026-01-14T18:00:00.000Z',
  },
  {
    id: 'c2',
    name: 'Spring Solar',
    state: 'Utah',
    color: '#10b981',
    active: true,
    contactName: 'Marta Reyes',
    contactRole: 'Operations Lead',
    contactEmail: 'marta@springsolar.example',
    contactPhone: '(801) 555-0119',
    appointmentCount: 87,
    createdAt: '2026-02-02T18:00:00.000Z',
  },
  {
    id: 'c3',
    name: 'Energy Upgrade',
    state: 'California',
    color: '#8b5cf6',
    active: true,
    contactName: 'Priya Raman',
    contactRole: 'COO',
    contactEmail: 'priya@energyupgrade.example',
    contactPhone: '(415) 555-0177',
    appointmentCount: 64,
    createdAt: '2026-03-11T18:00:00.000Z',
  },
  {
    id: 'c4',
    name: 'Forever Lit Solar',
    state: 'Texas',
    color: '#f59e0b',
    active: true,
    contactName: 'Bethany Wiggins',
    contactRole: 'Owner',
    contactEmail: 'bethany@foreverlit.example',
    contactPhone: '(214) 555-0193',
    appointmentCount: 33,
    createdAt: '2026-05-20T18:00:00.000Z',
  },
  {
    id: 'c5',
    name: 'Sunline Partners',
    state: 'Nevada',
    color: '#ec4899',
    active: false,
    contactName: 'Chris Nolan',
    contactRole: 'Founder',
    contactEmail: 'chris@sunline.example',
    contactPhone: '(702) 555-0166',
    appointmentCount: 12,
    createdAt: '2025-11-03T18:00:00.000Z',
  },
]

function mockAppt(
  i: number,
  name: string,
  client: Client,
  status: string,
  dispatch: string,
  county: string,
  bill: string,
): Appointment {
  const day = new Date(Date.UTC(2026, 6, 24 - i, 17 + (i % 4), 0, 0))
  return {
    id: `a${i}`,
    apptDateTime: day.toISOString(),
    customerName: name,
    customerPhone: `(•••) •••-${String(1000 + i * 7).slice(-4)}`,
    email: `${name.split(' ')[0].toLowerCase().slice(0, 2)}•••@example.com`,
    address: `${100 + i * 13} Sunview Dr`,
    county,
    status,
    dispatchStatus: dispatch,
    monthlyBill: bill,
    utilityProvider: ['APS', 'SRP', 'Rocky Mountain', 'PG&E'][i % 4],
    clientName: client.name,
    clientColor: client.color,
    agentName: ['Mary', 'Hannah', 'Alex'][i % 3],
    createdAt: day.toISOString(),
  }
}

const MOCK_APPOINTMENTS: Appointment[] = [
  mockAppt(0, 'Jordan Blake', MOCK_CLIENTS[0], 'booked', 'confirmed', 'Maricopa', '$240'),
  mockAppt(1, 'Alicia Moreno', MOCK_CLIENTS[1], 'showed', 'confirmed', 'Salt Lake', '$185'),
  mockAppt(2, 'Ray Whitfield', MOCK_CLIENTS[0], 'booked', 'dispatched', 'Pinal', '$310'),
  mockAppt(3, 'Nina Patel', MOCK_CLIENTS[2], 'no_show', 'confirmed', 'Alameda', '$275'),
  mockAppt(4, 'Marcus Hall', MOCK_CLIENTS[3], 'booked', 'not_dispatched', 'Dallas', '$198'),
  mockAppt(5, 'Sofia Duran', MOCK_CLIENTS[1], 'won', 'confirmed', 'Utah', '$420'),
  mockAppt(6, 'Ethan Cole', MOCK_CLIENTS[2], 'rescheduled', 'reschedule_requested', 'Contra Costa', '$160'),
  mockAppt(7, 'Grace Lin', MOCK_CLIENTS[0], 'showed', 'confirmed', 'Maricopa', '$355'),
  mockAppt(8, 'Owen Bryant', MOCK_CLIENTS[3], 'booked', 'needs_review', 'Tarrant', '$205'),
  mockAppt(9, 'Camila Ortiz', MOCK_CLIENTS[1], 'cancelled', 'not_dispatched', 'Davis', '$150'),
]
