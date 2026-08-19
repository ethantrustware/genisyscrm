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
    crm_user: 'Staff',
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

export type OppContext = {
  tags: string[]
  notes: Array<{ id: string; body: string; createdAt: string | null }>
  conversationId: string | null
  subAccount: string
  phone: string | null
  email: string | null
}

/** Tags, notes and the contact's conversation — one call per card open. */
export async function fetchOpportunityContext(
  subAccount: string,
  contactId: string,
): Promise<OppContext> {
  if (!isLive()) {
    return {
      tags: ['cold-call', 'contractor', 'roofing'],
      notes: [
        {
          id: 'n1',
          body: 'Left voicemail, calling back Thursday.\n\n— Alex Hyatt (via Genisys CRM)',
          createdAt: '2026-08-12T15:00:00.000Z',
        },
        {
          id: 'n2',
          body: 'Interested in the review system, not the website.',
          createdAt: '2026-08-08T15:00:00.000Z',
        },
      ],
      conversationId: 'c1',
      subAccount,
      phone: '(602) 555-0148',
      email: 'demo@example.com',
    }
  }
  const q = new URLSearchParams({ subAccount, contactId })
  return get(`/opportunities/context?${q.toString()}`)
}

/** Add a note to the contact behind an opportunity. Writes into GHL. */
export async function addOpportunityNote(input: {
  subAccount: string
  contactId: string
  body: string
}): Promise<{ contactId: string; saved: boolean }> {
  return write('/opportunities/note', 'POST', input)
}

export type FoundConversation = {
  found: boolean
  subAccount: string | null
  conversation: CrmConversation | null
}

/**
 * Resolve a contact to their existing conversation.
 *
 * `found: false` is a real answer, not an error — it means "never
 * messaged", which is what tells the UI to offer a compose box instead of
 * an empty thread.
 */
export async function findConversation(
  contactId: string,
  subAccount?: string,
): Promise<FoundConversation> {
  if (!isLive()) {
    return { found: false, subAccount: subAccount ?? null, conversation: null }
  }
  const q = new URLSearchParams({ contactId })
  if (subAccount) q.set('subAccount', subAccount)
  return get(`/crm/find-conversation?${q.toString()}`)
}

/** Send the first message to a contact who has no conversation yet. */
export async function startConversation(input: {
  subAccount: string
  contactId: string
  message: string
  type: 'SMS' | 'Email'
}): Promise<{ ok: boolean; conversationId?: string | null; error?: string }> {
  const conn = getConnection()
  if (!conn) {
    return { ok: false, error: 'Sign in to send messages.' }
  }
  try {
    const res = await fetch(`${conn.base}/api/external/v1/crm/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${conn.token}`,
      },
      body: JSON.stringify(input),
    })
    const d = (await res.json().catch(() => ({}))) as {
      error?: string
      conversationId?: string | null
    }
    if (!res.ok) return { ok: false, error: d.error ?? 'Send failed.' }
    return { ok: true, conversationId: d.conversationId ?? null }
  } catch {
    return { ok: false, error: 'Could not reach the Hub.' }
  }
}

/** Connected Gmail accounts that can be sent from. */
export async function fetchMailAccounts(): Promise<{
  accounts: Array<{ email: string; messages: number }>
}> {
  if (!isLive()) {
    return { accounts: [{ email: 'alex@leadgenisys.com', messages: 0 }] }
  }
  return get('/inbox/accounts')
}

/** Send an email through a connected Gmail account. Real mail. */
export async function sendMail(input: {
  from?: string
  to: string
  subject: string
  body: string
}): Promise<{ ok: boolean; error?: string }> {
  const conn = getConnection()
  if (!conn) return { ok: false, error: 'Sign in to send email.' }
  try {
    const res = await fetch(`${conn.base}/api/external/v1/inbox/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${conn.token}`,
      },
      body: JSON.stringify(input),
    })
    const d = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) return { ok: false, error: d.error ?? 'Send failed.' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not reach the Hub.' }
  }
}

/* -------------------------------------------------------------------------- */
/*  Documents (write)                                                         */
/* -------------------------------------------------------------------------- */

export type DocFolder = {
  id: string
  name: string
  parentId: string | null
  documentCount: number
  createdAt: string
}

export async function fetchFolders(): Promise<{ folders: DocFolder[] }> {
  if (!isLive()) {
    return {
      folders: [
        { id: 'f1', name: 'SOPs', parentId: null, documentCount: 2, createdAt: '2026-05-01T00:00:00.000Z' },
        { id: 'f2', name: 'Contracts', parentId: null, documentCount: 1, createdAt: '2026-05-01T00:00:00.000Z' },
        { id: 'f3', name: 'Training', parentId: null, documentCount: 1, createdAt: '2026-05-01T00:00:00.000Z' },
      ],
    }
  }
  return get('/documents/folders')
}

export const createFolder = (name: string) =>
  write<{ id: string; name: string }>('/documents/folders', 'POST', { name })

export const deleteFolder = (id: string) =>
  write<{ id: string }>(
    `/documents/folders?id=${encodeURIComponent(id)}`,
    'DELETE',
  )

export const moveDocument = (id: string, patch: Record<string, unknown>) =>
  write<{ id: string }>('/documents/move', 'PATCH', { id, ...patch })

export const deleteDocument = (id: string) =>
  write<{ id: string }>(`/documents/${id}`, 'DELETE')

/**
 * Upload a file.
 *
 * Content-Type is deliberately NOT set: the browser has to generate the
 * multipart boundary itself, and setting it by hand produces a body the
 * server cannot parse.
 */
export async function uploadDocument(
  file: File,
  folderId?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const conn = getConnection()
  if (!conn) return { ok: false, error: 'Sign in to upload files.' }

  const form = new FormData()
  form.append('file', file)
  if (folderId) form.append('folderId', folderId)

  try {
    const res = await fetch(`${conn.base}/api/external/v1/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${conn.token}` },
      body: form,
    })
    const d = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) return { ok: false, error: d.error ?? 'Upload failed.' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not reach the Hub.' }
  }
}

/**
 * Download a file.
 *
 * Fetched rather than linked: the endpoint needs an Authorization header,
 * which a plain <a href> cannot send. The bytes come back as a blob and
 * are handed to a temporary link so the browser saves them properly.
 */
export async function downloadDocument(
  id: string,
  filename: string,
): Promise<{ ok: boolean; error?: string }> {
  const conn = getConnection()
  if (!conn) return { ok: false, error: 'Sign in to download files.' }

  try {
    const res = await fetch(`${conn.base}/api/external/v1/documents/${id}`, {
      headers: { Authorization: `Bearer ${conn.token}` },
    })
    if (!res.ok) return { ok: false, error: 'Could not download that file.' }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Revoke on the next tick — immediately can cancel the download.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not reach the Hub.' }
  }
}

/* -------------------------------------------------------------------------- */
/*  Time clock                                                                */
/* -------------------------------------------------------------------------- */

export type ClockEntry = {
  id: string
  userId: string
  userName: string | null
  userEmail: string
  clockInAt: string
  clockOutAt: string | null
  minutes: number
  open: boolean
  note: string | null
  closedByAdmin: boolean
}

export type ClockState = {
  me: { id: string; name: string | null; email: string; role: string } | null
  isAdmin: boolean
  scope: 'me' | 'all'
  from: string
  to: string
  current: ClockEntry | null
  onNow: ClockEntry[]
  entries: ClockEntry[]
}

/**
 * Shifts overlapping a window.
 *
 * The window is computed in the browser and sent explicitly, because
 * "this week" depends on the viewer's timezone and the server has no
 * business guessing — Mary is ~7 hours off the US team.
 */
export async function fetchClock(opts: {
  from: Date
  to: Date
  scope?: 'me' | 'all'
}): Promise<ClockState> {
  if (!isLive()) {
    return {
      me: null,
      isAdmin: false,
      scope: 'me',
      from: opts.from.toISOString(),
      to: opts.to.toISOString(),
      current: null,
      onNow: [],
      entries: [],
    }
  }
  const q = new URLSearchParams({
    from: opts.from.toISOString(),
    to: opts.to.toISOString(),
  })
  if (opts.scope === 'all') q.set('scope', 'all')
  return get<ClockState>(`/clock?${q.toString()}`)
}

export async function clockPunch(
  action: 'in' | 'out',
  note?: string,
): Promise<ClockEntry> {
  const d = await write<{ entry: ClockEntry }>('/clock', 'POST', {
    action,
    ...(note ? { note } : {}),
  })
  return d.entry
}

/** Admin: close a shift somebody forgot to end. */
export async function closeShift(
  entryId: string,
  endAt: Date,
  note?: string,
): Promise<ClockEntry> {
  const d = await write<{ entry: ClockEntry }>('/clock', 'PATCH', {
    entryId,
    endAt: endAt.toISOString(),
    ...(note ? { note } : {}),
  })
  return d.entry
}

/** "7h 32m" — how a person says a shift length, not 7.53. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/**
 * Monday 00:00 local for the week containing `d`.
 *
 * Monday, not Sunday: shifts are worked on weekdays and a Sunday-start
 * week splits a normal work week across two columns.
 */
export function startOfWeek(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  // getDay(): 0 = Sunday. Shift so Monday is 0 and Sunday is 6.
  const offset = (out.getDay() + 6) % 7
  out.setDate(out.getDate() - offset)
  return out
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + n)
  return out
}

/* -------------------------------------------------------------------------- */
/*  GHL attribution diagnostic (one-off)                                      */
/* -------------------------------------------------------------------------- */

export type AttributionSubAccount = {
  vaultName: string
  locationName: string
  locationId: string
  userCount: number | null
  users: Array<{
    id: string | null
    name: string | null
    email: string | null
  }>
  usersError?: string
  calendarCount?: number
  calendars?: Array<{ id: string; name: string }>
  eventCount: number | null
  eventsWithAssignedUser?: number
  distinctAssignedUserIds?: string[]
  eventsError?: string
  sampleEvents?: Array<{
    id: string | null
    title: string | null
    startTime: string | null
    calendarName: string | null
    assignedUserId: string | null
    contactId: string | null
    appointmentStatus: string | null
    availableKeys: string[]
  }>
}

export type AttributionReport = {
  window: { start: string; end: string; days: number }
  verdict: {
    attribution: string
    everySubAccountHasExactlyOneUser: boolean
    subAccountsWithEvents: number
    totalEvents: number
    eventsCarryAssignedUserId: boolean
  }
  subAccountErrors: Array<{ vaultName: string; error: string }>
  subAccounts: AttributionSubAccount[]
}

/**
 * Runs the attribution diagnostic. Admin session required — the shared
 * environment token has no role behind it and will be refused.
 */
export async function fetchAttribution(days = 30): Promise<AttributionReport> {
  return get<AttributionReport>(`/diagnostics/ghl-attribution?days=${days}`)
}

/* -------------------------------------------------------------------------- */
/*  Staff bookings                                                            */
/* -------------------------------------------------------------------------- */

export type Attendance =
  | 'showed'
  | 'noshow'
  | 'cancelled'
  | 'upcoming'
  | 'unmarked'
  /** Junk, a test, or too old to count. Excluded from the Scoreboard. */
  | 'stale'

export type Booking = {
  id: string
  name: string
  stage: string
  /** From the GHL appointment, set by a human after the call. */
  attendance: Attendance
  appointmentAt: string | null
  /** Null when no calendar appointment matched; marking still works. */
  appointmentId: string | null
  subAccount: string
  status: string
  bookedAt: string | null
  createdAt: string | null
  updatedAt: string | null
  /** False when the row falls outside the selected window. */
  inWindow: boolean
  contactId: string | null
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  rep: string
  vaultName: string
}

export type StaffBookingsRep = {
  vaultName: string
  locationName: string
  locationId: string
  pipelineName?: string
  bookedStages?: string[]
  /** Pipelines in this sub-account that are NOT scanned. */
  otherPipelines?: string[]
  allStages?: string[]
  /** False when we couldn't read this sub-account's calendars. */
  attendanceAvailable?: boolean
  total?: number
  /** Ignores the date window — exposes date-filter problems. */
  totalAllTime?: number
  undated?: number
  error?: string
  bookings: Omit<Booking, 'rep' | 'vaultName'>[]
}

export type StaffBookings = {
  window: { since: string; days: number }
  stageFilter: string
  totals: {
    bookings: number
    bookingsAllTime: number
    reps: number
    repsWithErrors: number
  }
  subAccountErrors: Array<{ vaultName: string; error: string }>
  reps: StaffBookingsRep[]
  bookings: Booking[]
}

/**
 * Bookings across every sub-account, attributed to the rep who owns it.
 *
 * Slow by design — the Hub walks sub-accounts sequentially so GHL doesn't
 * throttle it into a partial answer that would read as "this rep booked
 * nothing".
 */
/**
 * Mark a booking showed / no-show / not marked.
 *
 * Keyed by opportunity, so it works on every row. Where a calendar
 * appointment is linked, the Hub also mirrors the value into GHL.
 */
export async function setAttendance(input: {
  opportunityId: string
  subAccount: string
  status: 'showed' | 'noshow' | 'unmarked' | 'stale'
  appointmentId?: string | null
}): Promise<void> {
  await write('/staff-bookings/attendance', 'PATCH', input)
}

/**
 * Demo board.
 *
 * Exists so the Scoreboard's design can be reviewed without a live Hub —
 * in Lovable's preview, or by anyone judging the layout. Dates are
 * generated relative to now so the today / week / 30-day splits are
 * always populated rather than drifting into an empty board.
 */
function demoStaffBookings(days: number): StaffBookings {
  const REPS = [
    { vaultName: 'demo-1', locationName: 'Sales 1' },
    { vaultName: 'demo-2', locationName: 'Team 2' },
    { vaultName: 'demo-3', locationName: 'Team 3' },
    { vaultName: 'demo-4', locationName: 'Team 4' },
    { vaultName: 'demo-5', locationName: 'Team 5' },
  ]
  const NAMES = [
    'Utah Flatwork Concrete',
    'Cedar Ridge Roofing',
    'Bluepoint Plumbing',
    'Ironwood Fencing',
    'Halcyon HVAC',
    'Northside Electric',
    'Granite Bay Landscaping',
    'Summit Gutters',
    'Redline Paving',
    'Harbor Window Co',
    'Foxglove Painting',
    'Copperfield Decks',
  ]
  // Hours back from now — a couple today, several this week, the rest older.
  const AGES = [2, 5, 9, 26, 31, 50, 74, 99, 140, 200, 400, 620]
  const OWNER = [3, 1, 3, 0, 3, 1, 4, 0, 1, 2, 3, 0]

  const bookings = NAMES.map((name, i) => {
    const rep = REPS[OWNER[i]]
    return {
      id: `demo-b${i}`,
      name,
      stage: 'Booked Meeting',
      // One stale row so the Scoreboard's exclusion is visible in preview.
      attendance: (i === 3
        ? 'stale'
        : i % 4 === 0
          ? 'showed'
          : i % 5 === 0
            ? 'noshow'
            : 'unmarked') as Attendance,
      appointmentAt: null,
      appointmentId: null,
      subAccount: rep.vaultName,
      status: 'open',
      bookedAt: new Date(Date.now() - AGES[i] * 3600_000).toISOString(),
      createdAt: null,
      updatedAt: null,
      inWindow: true,
      contactId: null,
      contactName: name,
      contactPhone: '+1 555 0100',
      contactEmail: null,
      rep: rep.locationName,
      vaultName: rep.vaultName,
    }
  })

  return {
    window: { since: new Date(Date.now() - days * 86400_000).toISOString(), days },
    stageFilter: 'demo',
    totals: {
      bookings: bookings.length,
      bookingsAllTime: bookings.length,
      reps: REPS.length,
      repsWithErrors: 0,
    },
    subAccountErrors: [],
    reps: REPS.map((r) => ({
      ...r,
      locationId: r.vaultName,
      pipelineName: 'Contractors (Cold Callers)',
      bookedStages: ['Booked Meeting'],
      total: bookings.filter((b) => b.vaultName === r.vaultName).length,
      totalAllTime: bookings.filter((b) => b.vaultName === r.vaultName).length,
      bookings: [],
    })),
    bookings,
  }
}

export async function fetchStaffBookings(
  days = 14,
  stage?: string,
  fresh = false,
): Promise<StaffBookings> {
  if (!isLive()) return demoStaffBookings(days)
  const q = new URLSearchParams({ days: String(days) })
  if (stage) q.set('stage', stage)
  // The Hub caches this for a minute; the refresh button means "now".
  if (fresh) q.set('fresh', '1')
  return get<StaffBookings>(`/staff-bookings?${q.toString()}`)
}

/* -------------------------------------------------------------------------- */
/*  Whop orders                                                               */
/* -------------------------------------------------------------------------- */

export type WhopOrder = {
  id: string
  status: string
  substatus: string | null
  createdAt: string | null
  paidAt: string | null
  total: number | null
  usdTotal: number | null
  afterFees: number | null
  refunded: number | null
  currency: string | null
  billingReason: string | null
  customerName: string | null
  customerEmail: string | null
  customerUsername: string | null
  productTitle: string | null
  planId: string | null
  membershipStatus: string | null
  cardBrand: string | null
  cardLast4: string | null
}

export type WhopOrders = {
  configured: boolean
  hint?: string
  error?: string
  truncated?: boolean
  window?: { days: number; since: string }
  summary: {
    count: number
    paidCount: number
    grossUsd: number
    netUsd: number
    refundedUsd: number
    last30Usd: number
    last30Count: number
    customers: number
  } | null
  orders: WhopOrder[]
}

/**
 * Confirmed Whop orders.
 *
 * `configured: false` is a normal state, not a failure — it means no API
 * key is in the Vault yet, and the page shows setup steps for it.
 */
export async function fetchWhopOrders(
  days = 90,
  status: 'paid' | 'all' = 'paid',
): Promise<WhopOrders> {
  if (!isLive()) return demoWhopOrders(days)
  const q = new URLSearchParams({ days: String(days), status })
  return get<WhopOrders>(`/whop/orders?${q.toString()}`)
}

/** Demo orders so the table design is reviewable without a live key. */
function demoWhopOrders(days: number): WhopOrders {
  const PEOPLE: Array<[string, string]> = [
    ['Marcus Hale', 'marcus@haleroofing.com'],
    ['Dana Whitfield', 'dana@whitfieldhvac.com'],
    ['Owen Brady', 'owen@bradyplumbing.co'],
    ['Priya Raman', 'priya@ramanelectric.com'],
    ['Cal Jensen', 'cal@jensenconcrete.com'],
  ]
  const orders: WhopOrder[] = Array.from({ length: 11 }, (_, i) => {
    const [name, email] = PEOPLE[i % PEOPLE.length]
    const at = new Date(Date.now() - (i * 6 + 1) * 86400_000).toISOString()
    return {
      id: `pay_demo${i}`,
      status: 'paid',
      substatus: null,
      createdAt: at,
      paidAt: at,
      total: 297,
      usdTotal: 297,
      afterFees: 288.09,
      refunded: 0,
      currency: 'usd',
      billingReason: i < PEOPLE.length ? 'subscription_create' : 'subscription_cycle',
      customerName: name,
      customerEmail: email,
      customerUsername: email.split('@')[0],
      productTitle: 'Genisys Contractor Package',
      planId: 'plan_demo',
      membershipStatus: 'active',
      cardBrand: ['visa', 'mastercard', 'amex'][i % 3],
      cardLast4: String(4242 - i),
    }
  })
  const monthAgo = Date.now() - 30 * 86400_000
  const last30 = orders.filter(
    (o) => o.paidAt && new Date(o.paidAt).getTime() >= monthAgo,
  )
  return {
    configured: true,
    window: { days, since: new Date(Date.now() - days * 86400_000).toISOString() },
    summary: {
      count: orders.length,
      paidCount: orders.length,
      grossUsd: orders.reduce((n, o) => n + (o.usdTotal ?? 0), 0),
      netUsd: orders.reduce((n, o) => n + (o.afterFees ?? 0), 0),
      refundedUsd: 0,
      last30Usd: last30.reduce((n, o) => n + (o.usdTotal ?? 0), 0),
      last30Count: last30.length,
      customers: PEOPLE.length,
    },
    orders,
  }
}

export type WhopProbe = {
  companyIdConfigured: boolean
  attempts: Array<{
    label: string
    url: string
    status: number
    ok: boolean
    body: string
  }>
}

/**
 * Ask the Hub to try several Whop request shapes and report which work.
 *
 * Runs through the signed-in session, because the raw endpoint needs an
 * Authorization header a browser address bar will never send.
 */
export async function probeWhop(): Promise<WhopProbe> {
  const d = await get<{ probe: WhopProbe }>('/whop/orders?probe=1')
  return d.probe
}
