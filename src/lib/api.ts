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
}

export type LeadRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  company: string | null
  serviceType: string | null
  zip: string | null
  status: string
  source: string
  createdAt: string
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
export async function fetchLeads(): Promise<LeadRow[]> {
  if (!isLive()) return MOCK_LEADS
  return get<LeadRow[]>('/leads')
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
  { id: 'u1', name: 'Mary', email: 'mary@leadgenisys.com', role: 'agent', image: null, appointmentCount: 184, lastBookingAt: '2026-07-24T15:00:00.000Z' },
  { id: 'u2', name: 'Hannah', email: 'hannah@leadgenisys.com', role: 'agent', image: null, appointmentCount: 96, lastBookingAt: '2026-07-23T18:00:00.000Z' },
  { id: 'u3', name: 'Alex', email: 'alex@leadgenisys.com', role: 'admin', image: null, appointmentCount: 22, lastBookingAt: '2026-07-19T14:00:00.000Z' },
  { id: 'u4', name: 'Ethan', email: 'ethan@leadgenisys.com', role: 'member', image: null, appointmentCount: 10, lastBookingAt: '2026-07-11T14:00:00.000Z' },
]

const MOCK_LEADS: LeadRow[] = [
  { id: 'l1', name: 'Dana Whitmore', email: 'da...@example.com', phone: '(...) ...-2201', company: null, serviceType: 'solar', zip: '85021', status: 'new', source: 'web_form', createdAt: '2026-07-24T14:00:00.000Z' },
  { id: 'l2', name: 'Victor Reyes', email: 'vi...@example.com', phone: '(...) ...-2245', company: 'Reyes HVAC', serviceType: 'roofing', zip: '75204', status: 'contacted', source: 'nct_media', createdAt: '2026-07-23T18:30:00.000Z' },
  { id: 'l3', name: 'Simone Clark', email: 'si...@example.com', phone: '(...) ...-2288', company: null, serviceType: 'solar', zip: '84101', status: 'qualified', source: 'referral', createdAt: '2026-07-22T16:15:00.000Z' },
  { id: 'l4', name: 'Andre Boyd', email: 'an...@example.com', phone: '(...) ...-2310', company: null, serviceType: 'roofing', zip: '85281', status: 'unqualified', source: 'nct_media', createdAt: '2026-07-21T19:45:00.000Z' },
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
