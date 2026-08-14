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

/* -------------------------------------------------------------------------- */
/*  Additional sections                                                       */
/* -------------------------------------------------------------------------- */

export type TodayData = {
  counts: { openTasks: number; appointmentsToday: number }
  tasks: Array<{
    id: string
    title: string
    notes: string | null
    dueAt: string | null
    priority: string
    done: boolean
    owner: string | null
  }>
  appointments: Array<{
    id: string
    apptDateTime: string
    customerName: string
    customerPhone: string | null
    status: string
    dispatchStatus: string
    clientName: string | null
    clientColor: string | null
  }>
}

export type Agent = {
  id: string
  name: string | null
  email: string | null
  role: string
  image: string | null
  appointmentCount: number
  lastBookingAt: string | null
  createdAt?: string | null
  approvedAt?: string | null
  timezone?: string | null
  phoneNumber?: string | null
  servicingState?: string | null
  hasPassword?: boolean
  activeSessions?: number
  lastSeenAt?: string | null
  isSelf?: boolean
}

export type DocRow = {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  folderName: string | null
  uploadedBy: string | null
  createdAt: string
}

export type InboxRow = {
  id: string
  from: string
  fromName: string | null
  subject: string
  snippet: string | null
  date: string
  isRead: boolean
  isLead: boolean
  category: string | null
  folder: string
}

export type PaymentsData = {
  week: {
    chargedCents: number
    costCents: number
    marginCents: number
    leadCount: number
  }
  clients: Array<{
    id: string
    clientName: string
    contactName: string | null
    pricePerLeadCents: number
    costPerLeadCents: number
    weeklyCapCents: number
    active: boolean
    hasStripeId: boolean
    weekSpentCents: number
  }>
  leads: Array<{
    id: string
    leadId: string
    name: string | null
    phone: string | null
    address: string | null
    clientName: string | null
    amountCents: number
    chargeStatus: string
    failureReason: string | null
    receivedAt: string
  }>
  sweeps: Array<{
    id: string
    amountCents: number
    method: string
    status: string
    createdAt: string
  }>
}

export async function fetchToday(): Promise<TodayData> {
  if (!isLive()) return MOCK_TODAY
  return get<TodayData>('/today')
}
export async function fetchAgents(): Promise<Agent[]> {
  if (!isLive()) return MOCK_AGENTS
  return get<Agent[]>('/agents')
}
export async function fetchDocuments(): Promise<DocRow[]> {
  if (!isLive()) return MOCK_DOCS
  return get<DocRow[]>('/documents')
}
export async function fetchInbox(): Promise<InboxRow[]> {
  if (!isLive()) return MOCK_INBOX
  return get<InboxRow[]>('/inbox')
}
export async function fetchPayments(): Promise<PaymentsData> {
  if (!isLive()) return MOCK_PAYMENTS
  return get<PaymentsData>('/payments')
}

/* ---- mocks ---- */

const MOCK_TODAY: TodayData = {
  counts: { openTasks: 7, appointmentsToday: 4 },
  tasks: [
    { id: 't1', title: 'Confirm Bethany roofing invoice', notes: null, dueAt: '2026-07-24T17:00:00.000Z', priority: 'high', done: false, owner: 'Alex' },
    { id: 't2', title: 'Review no-show follow-ups', notes: 'Brighton + Spring', dueAt: '2026-07-24T20:00:00.000Z', priority: 'medium', done: false, owner: 'Mary' },
    { id: 't3', title: 'Update dispatch SOP doc', notes: null, dueAt: null, priority: 'low', done: false, owner: 'Ethan' },
    { id: 't4', title: 'Weekly reconciliation', notes: 'Stripe vs Mercury', dueAt: '2026-07-25T16:00:00.000Z', priority: 'high', done: true, owner: 'Alex' },
  ],
  appointments: [
    { id: 'a1', apptDateTime: '2026-07-24T17:00:00.000Z', customerName: 'Jordan Blake', customerPhone: '(...) ...-1007', status: 'booked', dispatchStatus: 'confirmed', clientName: 'Brighton Solar', clientColor: '#3b82f6' },
    { id: 'a2', apptDateTime: '2026-07-24T19:30:00.000Z', customerName: 'Nina Patel', customerPhone: '(...) ...-1021', status: 'booked', dispatchStatus: 'dispatched', clientName: 'Energy Upgrade', clientColor: '#8b5cf6' },
    { id: 'a3', apptDateTime: '2026-07-24T21:00:00.000Z', customerName: 'Marcus Hall', customerPhone: '(...) ...-1035', status: 'booked', dispatchStatus: 'not_dispatched', clientName: 'Forever Lit Solar', clientColor: '#f59e0b' },
    { id: 'a4', apptDateTime: '2026-07-24T23:00:00.000Z', customerName: 'Grace Lin', customerPhone: '(...) ...-1049', status: 'rescheduled', dispatchStatus: 'reschedule_requested', clientName: 'Spring Solar', clientColor: '#10b981' },
  ],
}

const MOCK_AGENTS: Agent[] = [
  { id: 'u1', name: 'Alex Hyatt', email: 'alex@leadgenisys.com', role: 'admin', image: null, appointmentCount: 22, lastBookingAt: '2026-07-19T14:00:00.000Z', createdAt: '2025-11-02T14:00:00.000Z', timezone: 'America/New_York', hasPassword: true, activeSessions: 1, lastSeenAt: '2026-08-14T12:00:00.000Z', isSelf: true },
  { id: 'u2', name: 'Ethan Thompson', email: 'ethan@leadgenisys.com', role: 'member', image: null, appointmentCount: 10, lastBookingAt: '2026-07-11T14:00:00.000Z', createdAt: '2025-12-01T14:00:00.000Z', timezone: 'America/New_York', hasPassword: true, activeSessions: 0, lastSeenAt: null },
  { id: 'u3', name: 'Mary', email: 'mary@leadgenisys.com', role: 'agent', image: null, appointmentCount: 184, lastBookingAt: '2026-07-24T15:00:00.000Z', createdAt: '2026-01-15T14:00:00.000Z', timezone: 'Asia/Manila', servicingState: 'Arizona', hasPassword: true, activeSessions: 1, lastSeenAt: '2026-08-14T11:30:00.000Z' },
  { id: 'u4', name: 'Hannah', email: 'hannah@leadgenisys.com', role: 'agent', image: null, appointmentCount: 96, lastBookingAt: '2026-07-23T18:00:00.000Z', createdAt: '2026-02-20T14:00:00.000Z', hasPassword: true, activeSessions: 0, lastSeenAt: null },
  { id: 'u5', name: 'Devon Price', email: 'devon@example.com', role: 'crm_pending', image: null, appointmentCount: 0, lastBookingAt: null, createdAt: '2026-08-14T09:00:00.000Z', hasPassword: true, activeSessions: 0, lastSeenAt: null },
  { id: 'u6', name: 'Sam Rivera', email: 'sam@example.com', role: 'crm_pending', image: null, appointmentCount: 0, lastBookingAt: null, createdAt: '2026-08-13T16:00:00.000Z', hasPassword: true, activeSessions: 0, lastSeenAt: null },
  { id: 'u7', name: 'Old Contractor', email: 'old@example.com', role: 'agent_denied', image: null, appointmentCount: 3, lastBookingAt: '2026-03-02T14:00:00.000Z', createdAt: '2026-01-02T14:00:00.000Z', hasPassword: false, activeSessions: 0, lastSeenAt: null },
]

const MOCK_DOCS: DocRow[] = [
  { id: 'd1', filename: 'NCT-Roofing-Billing-SOP.pdf', mimeType: 'application/pdf', sizeBytes: 284_120, folderName: 'SOPs', uploadedBy: 'Alex', createdAt: '2026-07-20T18:00:00.000Z' },
  { id: 'd2', filename: 'Brighton-Contract-2026.pdf', mimeType: 'application/pdf', sizeBytes: 512_990, folderName: 'Contracts', uploadedBy: 'Alex', createdAt: '2026-06-02T18:00:00.000Z' },
  { id: 'd3', filename: 'agent-onboarding.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sizeBytes: 88_400, folderName: 'Training', uploadedBy: 'Mary', createdAt: '2026-05-14T18:00:00.000Z' },
  { id: 'd4', filename: 'dispatch-flow.png', mimeType: 'image/png', sizeBytes: 1_204_338, folderName: 'SOPs', uploadedBy: 'Ethan', createdAt: '2026-04-30T18:00:00.000Z' },
]

const MOCK_INBOX: InboxRow[] = [
  { id: 'e1', from: 'bethany@foreverlit.example', fromName: 'Bethany Wiggins', subject: 'Re: roofing lead billing', snippet: 'That works - go ahead and start sending them through.', date: '2026-07-24T13:20:00.000Z', isRead: false, isLead: false, category: 'client', folder: 'inbox' },
  { id: 'e2', from: 'ops@nctmedia.example', fromName: 'NCT Media', subject: 'Webhook integration confirmed', snippet: 'We have the endpoint configured on our side and will begin...', date: '2026-07-24T11:05:00.000Z', isRead: true, isLead: false, category: 'partner', folder: 'inbox' },
  { id: 'e3', from: 'newlead@example.com', fromName: null, subject: 'Interested in solar quote', snippet: 'Hi, I saw your ad and wanted to know more about pricing for...', date: '2026-07-23T22:40:00.000Z', isRead: false, isLead: true, category: 'lead', folder: 'inbox' },
  { id: 'e4', from: 'david@brightonsolar.example', fromName: 'David Mehta', subject: 'Weekly numbers', snippet: 'Can you send over the show-rate breakdown for last week?', date: '2026-07-23T16:10:00.000Z', isRead: true, isLead: false, category: 'client', folder: 'inbox' },
]

const MOCK_PAYMENTS: PaymentsData = {
  week: { chargedCents: 90_000, costCents: 66_000, marginCents: 24_000, leadCount: 6 },
  clients: [
    { id: 'n1', clientName: 'Forever Lit Solar LLC', contactName: 'Bethany Wiggins', pricePerLeadCents: 15_000, costPerLeadCents: 11_000, weeklyCapCents: 180_000, active: true, hasStripeId: true, weekSpentCents: 90_000 },
  ],
  leads: [
    { id: 'p1', leadId: 'NCT-10482', name: 'Jane Doe', phone: '(...) ...-4567', address: '123 Main St, Dallas TX', clientName: 'Forever Lit Solar LLC', amountCents: 15_000, chargeStatus: 'charged', failureReason: null, receivedAt: '2026-07-24T15:02:00.000Z' },
    { id: 'p2', leadId: 'NCT-10481', name: 'Robert Yi', phone: '(...) ...-4590', address: '88 Oak Ave, Plano TX', clientName: 'Forever Lit Solar LLC', amountCents: 15_000, chargeStatus: 'charged', failureReason: null, receivedAt: '2026-07-24T12:40:00.000Z' },
    { id: 'p3', leadId: 'NCT-10480', name: 'Maria Santos', phone: '(...) ...-4612', address: '9 Pine Rd, Irving TX', clientName: 'Forever Lit Solar LLC', amountCents: 15_000, chargeStatus: 'failed', failureReason: 'Card declined - insufficient funds.', receivedAt: '2026-07-23T20:15:00.000Z' },
  ],
  sweeps: [
    { id: 's1', amountCents: 74_500, method: 'standard', status: 'ok', createdAt: '2026-07-24T09:00:00.000Z' },
    { id: 's2', amountCents: 60_000, method: 'standard', status: 'ok', createdAt: '2026-07-23T09:00:00.000Z' },
  ],
}

/* -------------------------------------------------------------------------- */
/*  Session                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Access model, stated plainly:
 *
 * The API token IS the credential. It is validated against the Hub before
 * the app will let you in, and without it the Hub returns nothing — so
 * this is a real gate, not a UI that merely hides content.
 *
 * "Demo" is an explicit second mode that grants access to mock data only.
 * It exists so the UI can be designed and reviewed without handing out a
 * credential that reads real client data.
 */

const LS_MODE = 'genisys.mode'

export type Mode = 'live' | 'demo'

export function getMode(): Mode | null {
  try {
    if (getConnection()) return 'live'
    return localStorage.getItem(LS_MODE) === 'demo' ? 'demo' : null
  } catch {
    return null
  }
}

export function enterDemoMode() {
  try {
    localStorage.setItem(LS_MODE, 'demo')
  } catch {
    /* storage blocked */
  }
}

export function signOut() {
  clearConnection()
  try {
    localStorage.removeItem(LS_MODE)
  } catch {
    /* storage blocked */
  }
}

/** Name shown in the sidebar for the current session. */
export function sessionLabel(): string {
  try {
    return localStorage.getItem('genisys.sessionName') || 'Signed in'
  } catch {
    return 'Signed in'
  }
}

export function setSessionLabel(name: string) {
  try {
    localStorage.setItem('genisys.sessionName', name)
  } catch {
    /* storage blocked */
  }
}

/**
 * SSR-safe access check. The server has no localStorage, so it always
 * reports "not ready"; the client resolves after mount. Gating on the
 * server value instead would flash the login screen for signed-in users.
 */
export function useAccess(): { ready: boolean; mode: Mode | null } {
  const [state, setState] = useState<{ ready: boolean; mode: Mode | null }>({
    ready: false,
    mode: null,
  })
  useEffect(() => setState({ ready: true, mode: getMode() }), [])
  return state
}

/* -------------------------------------------------------------------------- */
/*  Account auth                                                              */
/* -------------------------------------------------------------------------- */

export type AuthResult = { ok: boolean; message: string; pending?: boolean }

/**
 * Sign in with an email and password.
 *
 * On success the Hub returns a session token, which becomes the
 * credential for every subsequent request. It is stored in this browser
 * only and expires after 30 days.
 */
export async function loginWithPassword(
  base: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  const root = base.replace(/\/+$/, '')
  try {
    const res = await fetch(`${root}/api/external/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const d = (await res.json().catch(() => ({}))) as {
      token?: string
      user?: { name?: string | null; email?: string }
      error?: string
      pending?: boolean
    }

    if (!res.ok || !d.token) {
      return {
        ok: false,
        pending: d.pending ?? false,
        message: d.error ?? 'Could not sign in.',
      }
    }

    setConnection(root, d.token)
    setSessionLabel(d.user?.name || d.user?.email || 'Signed in')
    return { ok: true, message: 'Signed in.' }
  } catch {
    return {
      ok: false,
      message: 'Could not reach the Hub. Check your connection and try again.',
    }
  }
}

/**
 * Request an account. Always lands as pending — an admin approves before
 * sign-in works, because this app reads real client data.
 */
export async function registerAccount(
  base: string,
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  const root = base.replace(/\/+$/, '')
  try {
    const res = await fetch(`${root}/api/external/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    const d = (await res.json().catch(() => ({}))) as {
      message?: string
      error?: string
    }
    if (!res.ok) {
      return { ok: false, message: d.error ?? 'Could not create the account.' }
    }
    return {
      ok: true,
      message:
        d.message ??
        'Request received. An admin will approve your account before you can sign in.',
    }
  } catch {
    return {
      ok: false,
      message: 'Could not reach the Hub. Check your connection and try again.',
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  CRM (GoHighLevel)                                                         */
/* -------------------------------------------------------------------------- */

export type SubAccount = {
  vaultName: string
  locationId: string
  locationName: string
}

export type CrmConversation = {
  id: string
  contactId: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  lastMessageBody: string | null
  lastMessageDate: string | null
  lastMessageType: string | null
  unreadCount: number
}

export type CrmGroup = {
  subAccount: SubAccount
  conversations: CrmConversation[]
  nextCursor: string | null
  error: string | null
}

export type CrmMessage = {
  id: string
  body: string | null
  direction: 'inbound' | 'outbound'
  dateAdded: string | null
  messageType: string | null
  attachments: string[]
}

export type CrmThread = {
  conversation: CrmConversation
  messages: CrmMessage[]
  contact: Record<string, string | null> | null
}

export async function fetchSubAccounts(): Promise<{
  subAccounts: SubAccount[]
  errors: Array<{ vaultName: string; error: string }>
}> {
  if (!isLive()) {
    return { subAccounts: MOCK_SUBACCOUNTS, errors: [] }
  }
  return get('/crm/subaccounts')
}

export async function fetchConversations(
  subAccount: string,
  cursor?: string,
): Promise<{ groups: CrmGroup[] }> {
  if (!isLive()) return { groups: MOCK_CRM_GROUPS }
  const q = new URLSearchParams({ subAccount, limit: '50' })
  if (cursor) q.set('cursor', cursor)
  return get(`/crm/conversations?${q.toString()}`)
}

export async function fetchThread(
  subAccount: string,
  convId: string,
): Promise<CrmThread> {
  if (!isLive()) {
    return MOCK_THREADS[convId] ?? MOCK_THREADS.c1
  }
  const q = new URLSearchParams({ subAccount, convId })
  return get(`/crm/thread?${q.toString()}`)
}

/* ---- mocks ---- */

const MOCK_SUBACCOUNTS: SubAccount[] = [
  { vaultName: 'GHL Genisys Token', locationId: 'loc_genisys', locationName: 'Genisys (agency)' },
  { vaultName: 'GHL Brighton Token', locationId: 'loc_brighton', locationName: 'Brighton Solar' },
  { vaultName: 'GHL Spring Token', locationId: 'loc_spring', locationName: 'Spring Solar' },
]

function mockConv(
  id: string,
  name: string,
  body: string,
  hoursAgo: number,
  unread = 0,
  type = 'TYPE_SMS',
): CrmConversation {
  return {
    id,
    contactId: `ct_${id}`,
    contactName: name,
    contactEmail: `${name.split(' ')[0].toLowerCase()}@example.com`,
    contactPhone: '(602) 555-0148',
    lastMessageBody: body,
    lastMessageDate: new Date(
      Date.UTC(2026, 6, 24, 18, 0, 0) - hoursAgo * 3600 * 1000,
    ).toISOString(),
    lastMessageType: type,
    unreadCount: unread,
  }
}

const MOCK_CRM_GROUPS: CrmGroup[] = [
  {
    subAccount: MOCK_SUBACCOUNTS[0],
    nextCursor: null,
    error: null,
    conversations: [
      mockConv('c1', 'Jordan Blake', 'Yes that time works for me, see you then', 1, 2),
      mockConv('c2', 'Alicia Moreno', 'Can we move it to Thursday instead?', 4),
      mockConv('c3', 'Ray Whitfield', 'Thanks for the info', 26, 0, 'TYPE_EMAIL'),
      mockConv('c4', 'Nina Patel', 'Who is this?', 50),
    ],
  },
]

const MOCK_THREADS: Record<string, CrmThread> = {
  c1: {
    conversation: MOCK_CRM_GROUPS[0].conversations[0],
    contact: {
      id: 'ct_c1',
      firstName: 'Jordan',
      lastName: 'Blake',
      email: 'jordan@example.com',
      phone: '(602) 555-0148',
      companyName: null,
      source: 'Facebook Ad',
      dateAdded: '2026-07-18T15:00:00.000Z',
      city: 'Phoenix',
      state: 'AZ',
    },
    messages: [
      { id: 'm1', body: 'Hi Jordan, this is Mary with Genisys — confirming your solar consultation for Friday at 1pm.', direction: 'outbound', dateAdded: '2026-07-23T16:00:00.000Z', messageType: 'TYPE_SMS', attachments: [] },
      { id: 'm2', body: 'Yes that time works for me, see you then', direction: 'inbound', dateAdded: '2026-07-23T16:14:00.000Z', messageType: 'TYPE_SMS', attachments: [] },
      { id: 'm3', body: 'Perfect — you will get a reminder the morning of.', direction: 'outbound', dateAdded: '2026-07-23T16:15:00.000Z', messageType: 'TYPE_SMS', attachments: [] },
    ],
  },
}

/**
 * Send an SMS or email into a GHL conversation.
 *
 * The only write this app performs. It reaches a real customer, so it
 * never runs in demo mode — there is no safe pretend version of sending
 * someone a text.
 */
export async function sendCrmMessage(input: {
  subAccount: string
  conversationId: string
  contactId?: string | null
  message: string
  type: 'SMS' | 'Email'
}): Promise<{ ok: boolean; error?: string }> {
  const conn = getConnection()
  if (!conn) {
    return {
      ok: false,
      error: 'Sign in to send messages — demo mode cannot reach customers.',
    }
  }

  try {
    const res = await fetch(`${conn.base}/api/external/v1/crm/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${conn.token}`,
      },
      body: JSON.stringify({
        subAccount: input.subAccount,
        conversationId: input.conversationId,
        contactId: input.contactId ?? undefined,
        message: input.message,
        type: input.type,
      }),
    })
    const d = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) return { ok: false, error: d.error ?? 'Send failed.' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not reach the Hub.' }
  }
}

/* -------------------------------------------------------------------------- */
/*  Writes                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * All writes go through here. Demo mode is refused up front rather than
 * faked — a demo that pretends to save is worse than one that says it
 * can't, because you find out later that nothing was real.
 */
async function write<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  payload?: Record<string, unknown>,
): Promise<T> {
  const conn = getConnection()
  if (!conn) {
    throw new ApiError('Sign in to make changes — demo mode is read-only.')
  }
  const res = await fetch(`${conn.base}/api/external/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${conn.token}`,
    },
    body: payload ? JSON.stringify(payload) : undefined,
  })
  const d = (await res.json().catch(() => ({}))) as {
    data?: T
    error?: string
  }
  if (!res.ok) throw new ApiError(d.error ?? 'Something went wrong.')
  return d.data as T
}

export type EmailDetail = {
  id: string
  from: string
  fromName: string | null
  to: string
  subject: string
  bodyText: string | null
  bodyHtml: string | null
  snippet: string | null
  date: string
  isRead: boolean
  isLead: boolean
  category: string | null
  folder: string
}

export async function fetchEmail(id: string): Promise<EmailDetail> {
  if (!isLive()) {
    const row = MOCK_INBOX.find((m) => m.id === id) ?? MOCK_INBOX[0]
    return {
      ...row,
      to: 'alex@leadgenisys.com',
      bodyText: `${row.snippet ?? ''}\n\n(Demo message — sign in to read real email.)`,
      bodyHtml: null,
    }
  }
  return get<EmailDetail>(`/inbox/${id}`)
}

export const createTask = (t: {
  title: string
  notes?: string
  priority?: string
  dueAt?: string | null
}) => write<{ id: string }>('/tasks', 'POST', t)

export const updateTask = (id: string, patch: Record<string, unknown>) =>
  write<{ id: string }>(`/tasks/${id}`, 'PATCH', patch)

export const deleteTask = (id: string) =>
  write<{ id: string }>(`/tasks/${id}`, 'DELETE')

export const createClient = (c: Record<string, unknown>) =>
  write<{ id: string; name: string }>('/clients/manage', 'POST', c)

export const updateClient = (id: string, patch: Record<string, unknown>) =>
  write<{ id: string }>('/clients/manage', 'PATCH', { id, ...patch })

export const updateAgent = (p: {
  id: string
  action: string
  role?: string
}) => write<{ id: string; role?: string }>('/agents/manage', 'PATCH', p)

export type CalendarAppt = {
  id: string
  apptDateTime: string
  customerName: string
  customerPhone: string | null
  address: string | null
  status: string
  dispatchStatus: string
  clientName: string | null
  clientColor: string | null
  agentName: string | null
}

export async function fetchCalendar(
  from?: string,
  to?: string,
): Promise<{ appointments: CalendarAppt[] }> {
  if (!isLive()) {
    return {
      appointments: MOCK_APPOINTMENTS.map((a) => ({
        id: a.id,
        apptDateTime: a.apptDateTime,
        customerName: a.customerName,
        customerPhone: a.customerPhone,
        address: a.address,
        status: a.status,
        dispatchStatus: a.dispatchStatus,
        clientName: a.clientName,
        clientColor: a.clientColor,
        agentName: a.agentName,
      })),
    }
  }
  const q = new URLSearchParams()
  if (from) q.set('from', from)
  if (to) q.set('to', to)
  return get(`/calendar?${q.toString()}`)
}

export type Meeting = {
  id: string
  title: string
  startTime: string | null
  endTime: string | null
  contactName: string | null
  calendarName: string | null
  status: string | null
  joinUrl: string | null
  joinKind: string | null
  joinLabel: string | null
}

/** Booked calendar meetings. Distinct from appointments — these can carry
 *  a Zoom/Meet/Teams link, which is what the Join button opens. */
export async function fetchMeetings(): Promise<{ meetings: Meeting[] }> {
  if (!isLive()) return { meetings: MOCK_MEETINGS }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  return get(`/meetings?tz=${encodeURIComponent(tz)}`)
}

const MOCK_MEETINGS: Meeting[] = [
  {
    id: 'mt1',
    title: 'Growth Strategy Follow-up Call: Lead Genisys',
    startTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 75 * 60 * 1000).toISOString(),
    contactName: 'Paige Kemper',
    calendarName: 'Sales',
    status: 'confirmed',
    joinUrl: 'https://meet.google.com/demo-abc-defg',
    joinKind: 'meet',
    joinLabel: 'Join Meet',
  },
]

export type CalEvent = {
  id: string
  title: string
  startTime: string | null
  endTime: string | null
  contactName: string | null
  status: string | null
  subAccount: string | null
  subAccountName: string | null
  joinUrl: string | null
  joinKind: string | null
  joinLabel: string | null
}

/** Calendar events across every sub-account + iCal feed, for the month view. */
export async function fetchCalendarEvents(
  start: Date,
  end: Date,
): Promise<{ events: CalEvent[]; subAccounts: Array<{ id: string; name: string }> }> {
  if (!isLive()) {
    return { events: MOCK_CAL_EVENTS, subAccounts: MOCK_CAL_SUBS }
  }
  const q = new URLSearchParams({
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  })
  return get(`/calendar-events?${q.toString()}`)
}

const MOCK_CAL_SUBS = [
  { id: 'GHL Genisys Token', name: 'Lead Genisys' },
  { id: 'GHL Sales 1', name: 'Lead Genisys Sales 1' },
]

function mockEvent(dayOffset: number, hour: number, title: string, who: string, sub: number, status = 'confirmed'): CalEvent {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(hour, 0, 0, 0)
  const end = new Date(d.getTime() + 30 * 60 * 1000)
  return {
    id: `ev-${dayOffset}-${hour}`,
    title,
    startTime: d.toISOString(),
    endTime: end.toISOString(),
    contactName: who,
    status,
    subAccount: MOCK_CAL_SUBS[sub].id,
    subAccountName: MOCK_CAL_SUBS[sub].name,
    joinUrl: 'https://meet.google.com/demo-abc-defg',
    joinKind: 'meet',
    joinLabel: 'Join Meet',
  }
}

const MOCK_CAL_EVENTS: CalEvent[] = [
  mockEvent(0, 13, 'Growth Strategy Follow-up Call', 'Paige Kemper', 0),
  mockEvent(0, 16, 'Discovery Call', 'Marcus Hall', 1),
  mockEvent(1, 10, 'Onboarding Kickoff', 'Bethany Wiggins', 0),
  mockEvent(2, 14, 'Website Review', 'Guy Stone', 1, 'confirmed'),
  mockEvent(4, 11, 'Follow-up', 'Nina Patel', 0, 'cancelled'),
  mockEvent(-2, 15, 'Intro Call', 'Ray Whitfield', 1, 'noshow'),
]

/**
 * Permanently delete an account. The Hub refuses if the person has
 * booking history — deleting them would cascade to their appointments.
 */
export const deleteStaff = (id: string) =>
  write<{ id: string; deleted: boolean }>(
    `/agents/manage?id=${encodeURIComponent(id)}`,
    'DELETE',
  )

/* -------------------------------------------------------------------------- */
/*  Opportunities                                                             */
/* -------------------------------------------------------------------------- */

export type PipelineStage = { id: string; name: string; position: number }
export type Pipeline = { id: string; name: string; stages: PipelineStage[] }

export type Opportunity = {
  id: string
  name: string
  value: number
  status: string
  stageId: string | null
  pipelineId: string | null
  source: string | null
  assignedTo: string | null
  createdAt: string | null
  updatedAt: string | null
  contactId: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
}

export async function fetchPipelines(subAccount?: string): Promise<{
  subAccounts: Array<{ vaultName: string; locationName: string }>
  subAccountErrors: Array<{ vaultName: string; error: string }>
  activeSubAccount: string
  pipelines: Pipeline[]
}> {
  if (!isLive()) {
    return {
      subAccounts: MOCK_SUBACCOUNTS.map((s) => ({
        vaultName: s.vaultName,
        locationName: s.locationName,
      })),
      subAccountErrors: [],
      activeSubAccount: MOCK_SUBACCOUNTS[0].vaultName,
      pipelines: MOCK_PIPELINES,
    }
  }
  const q = subAccount ? `?subAccount=${encodeURIComponent(subAccount)}` : ''
  return get(`/opportunities/pipelines${q}`)
}

export async function fetchOpportunities(
  subAccount: string,
  pipelineId: string,
): Promise<{ opportunities: Opportunity[] }> {
  if (!isLive()) return { opportunities: MOCK_OPPS }
  const q = new URLSearchParams({ subAccount, pipelineId })
  return get(`/opportunities?${q.toString()}`)
}

/* ---- mocks ---- */

const MOCK_PIPELINES: Pipeline[] = [
  {
    id: 'pl0',
    name: 'Legacy Solar',
    stages: [{ id: 'z1', name: 'Old stage', position: 0 }],
  },
  {
    id: 'pl1',
    name: 'Contractors (Cold Callers)',
    stages: [
      { id: 's1', name: 'New Lead', position: 0 },
      { id: 's2', name: 'Contacted', position: 1 },
      { id: 's3', name: 'Demo Booked', position: 2 },
      { id: 's4', name: 'Proposal Sent', position: 3 },
      { id: 's5', name: 'Won', position: 4 },
    ],
  },
  {
    id: 'pl2',
    name: 'Cold Outreach',
    stages: [
      { id: 't1', name: 'Prospect', position: 0 },
      { id: 't2', name: 'Dialed', position: 1 },
      { id: 't3', name: 'Interested', position: 2 },
    ],
  },
]

function mockOpp(
  id: string,
  name: string,
  contact: string,
  stageId: string,
  value: number,
  status = 'open',
): Opportunity {
  return {
    id,
    name,
    value,
    status,
    stageId,
    pipelineId: 'pl1',
    source: 'Cold call',
    assignedTo: null,
    createdAt: '2026-08-01T15:00:00.000Z',
    updatedAt: '2026-08-12T15:00:00.000Z',
    contactId: 'ct-' + id,
    contactName: contact,
    contactEmail: contact.split(' ')[0].toLowerCase() + '@example.com',
    contactPhone: '(602) 555-0148',
    }
}

const MOCK_OPPS: Opportunity[] = [
  mockOpp('o1', 'Stone Systems - website + AI', 'Guy Stone', 's1', 297),
  mockOpp('o2', 'Glassport Windows', 'Manny Ruiz', 's1', 297),
  mockOpp('o3', 'Apex Roofing', 'Dana Whitmore', 's2', 297),
  mockOpp('o4', 'Reyes HVAC', 'Victor Reyes', 's3', 594),
  mockOpp('o5', 'Clark Contracting', 'Simone Clark', 's4', 297),
  mockOpp('o6', 'Boyd Exteriors', 'Andre Boyd', 's5', 297, 'won'),
  mockOpp('o7', 'Hilltop Builders', 'Nina Patel', 's2', 297, 'lost'),
]

/* -------------------------------------------------------------------------- */
/*  Session identity                                                          */
/* -------------------------------------------------------------------------- */

export type Me = {
  tokenName: string
  scope: string
  hub: string
  user: {
    id: string
    name: string | null
    email: string
    role: string
  } | null
}

/**
 * The signed-in account, read from the Hub rather than cached at login,
 * so a promotion or revocation shows on the next load instead of leaving
 * a stale label until sign-out.
 */
export async function fetchCurrentUser(): Promise<Me> {
  if (!isLive()) {
    return { tokenName: 'Demo', scope: 'read', hub: 'Genisys Hub', user: null }
  }
  return get<Me>('/me')
}

/** Role slug -> something a human would say. */
export function roleLabel(role: string | null | undefined): string {
  if (!role) return 'Signed in'
  const map: Record<string, string> = {
    admin: 'Admin',
    member: 'Member',
    agent: 'Agent',
    crm_user: 'CRM user',
    crm_pending: 'Pending approval',
    crm_denied: 'No access',
    agent_pending: 'Pending approval',
    agent_denied: 'No access',
  }
  return map[role] ?? role.replace(/_/g, ' ')
}

/**
 * Move an opportunity to another stage. Demo mode refuses rather than
 * pretending — a board that appears to save and doesn't is worse than
 * one that says it can't.
 */
export async function moveOpportunity(input: {
  subAccount: string
  opportunityId: string
  pipelineId: string
  stageId: string
}): Promise<{ opportunityId: string; stageId: string }> {
  return write('/opportunities/move', 'PATCH', input)
}
