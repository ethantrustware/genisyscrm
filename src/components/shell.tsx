import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import {
  Building2,
  Clock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FolderOpen,
  Inbox,
  KanbanSquare,
  LayoutGrid,
  Menu,
  MessagesSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  PhoneCall,
  Plug,
  Trophy,
  Sun,
  Users,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { applyTabOrder, isDarkTheme, usePrefs } from '@/lib/prefs'
import {
  fetchCurrentUser,
  roleLabel,
  sessionLabel,
  signOut,
  useAccess,
  useIsLive,
} from '@/lib/api'

/**
 * App shell — a port of the Hub's sidebar + layout, class-for-class, so
 * this app reads as the same product rather than a lookalike.
 *
 * This route is server-rendered, so every browser-only value starts at a
 * neutral default and is corrected in an effect after mount. Reading
 * localStorage during render would disagree with the server markup.
 */

/**
 * `owner: true` keeps a tab off staff navigation.
 *
 * This is presentation only and is NOT the security boundary — every
 * owner-only endpoint enforces the same rule server-side and answers 403
 * regardless of what the sidebar shows. Hiding the link just stops staff
 * being offered a door that won't open.
 *
 * `staffLocked: true` shows the tab to staff but greyed out and
 * unclickable. Call Center and Leaderboard both need an admin view
 * distinct from the staff one, and that split isn't designed yet —
 * showing them dimmed signals "coming" instead of pretending they don't
 * exist. Owners can open them and see the placeholder.
 */
const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid },
  { to: '/today', label: 'Today', icon: CheckCircle2 },
  { to: '/inbox', label: 'Inbox', icon: Inbox, owner: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/crm', label: 'CRM', icon: MessagesSquare },
  { to: '/opportunities', label: 'Opportunities', icon: KanbanSquare },
  { to: '/clock', label: 'Timeclock', icon: Clock },
  { to: '/call-center', label: 'Call Center', icon: PhoneCall, staffLocked: true },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy, staffLocked: true },
  { to: '/clients', label: 'Clients', icon: Building2, owner: true },
  { to: '/agents', label: 'Staff', icon: Users, owner: true },
  { to: '/documents', label: 'Documents', icon: FolderOpen },
  { to: '/payments', label: 'Payments', icon: Wallet, owner: true },
  { to: '/connect', label: 'Settings', icon: Plug },
]

const OWNER_ROLES = new Set(['admin', 'member'])

function Sidebar({ mobileOpen }: { mobileOpen: boolean }) {
  const [collapsed, setCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [label, setLabel] = useState('Signed in')

  const live = useIsLive()
  const navigate = useNavigate()

  useEffect(() => setLabel(sessionLabel()), [])

  // Role comes from the Hub, not from what was cached at sign-in, so a
  // promotion or revocation shows up without signing out first.
  const me = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    enabled: live,
    staleTime: 60_000,
  })

  const who = me.data?.user?.email ?? 'demo'
  const { prefs, update } = usePrefs(who)

  // Theme lives in prefs and nowhere else. This button used to own its
  // own state and write localStorage directly, which meant toggling here
  // never updated the Settings selector — and the next prefs sync would
  // apply the stale saved value and undo the toggle. One source of
  // truth, both surfaces read and write it.
  //
  // Resolved after mount only: the server has no matchMedia, and reading
  // it during render would disagree with the server markup.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const dark = mounted ? isDarkTheme(prefs.theme) : false
  // Toggling from 'system' commits to an explicit choice, which is what
  // clicking a light/dark button means.
  const toggle = () => update({ theme: dark ? 'light' : 'dark' })

  // Role decides which tabs exist at all; the per-user preference only
  // hides tabs the person was entitled to in the first place.
  //
  // While the role is still loading we show the staff set, not the full
  // one. Defaulting the other way would flash Payments and Clients at a
  // rep on every page load before snapping them away.
  const role = me.data?.user?.role
  const showOwnerTabs = live ? OWNER_ROLES.has(role ?? '') : true

  // Settings must never hide itself, or there is no way back to unhide
  // anything — the only fix would be clearing site data.
  const visibleNav = applyTabOrder(
    NAV.filter((item) => {
      if (item.owner && !showOwnerTabs) return false
      return item.to === '/connect' || !prefs.hiddenTabs.includes(item.to)
    }),
    prefs.tabOrder,
  )

  const handleSignOut = () => {
    signOut()
    navigate({ to: '/login' })
  }

  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('sidebar-collapsed') === 'true')
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem('sidebar-collapsed', String(collapsed))
    } catch {
      /* ignore */
    }
  }, [collapsed, hydrated])

  return (
    <aside
      className={cn(
        'shrink-0 flex-col gap-2 border-r border-border-soft bg-sidebar py-5 transition-[width] duration-200 md:flex',
        mobileOpen ? 'flex' : 'hidden',
        collapsed ? 'w-[68px] px-2' : 'w-[260px] px-4',
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'mb-2 flex items-center px-2',
          collapsed ? 'flex-col gap-1' : 'justify-between',
        )}
      >
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <LayoutGrid className="h-4 w-4" strokeWidth={2.25} />
          </div>
          {!collapsed && (
            <span className="text-[17px] font-semibold tracking-tight text-sidebar-foreground">
              Genisys
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle theme"
            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label="Collapse sidebar"
            className="hidden h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:grid"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {!collapsed && (
        <p className="mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Main menu
        </p>
      )}

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {visibleNav.map((item) => {
          const Icon = item.icon
          const active =
            item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)

          // Locked tabs render as plain text, not a disabled link. A
          // disabled <a> is still focusable and still navigable by
          // keyboard in some browsers, which would defeat the point.
          if (item.staffLocked && !showOwnerTabs) {
            return (
              <div
                key={item.to}
                aria-disabled="true"
                title={`${item.label} — coming soon`}
                className={cn(
                  collapsed
                    ? 'grid h-10 w-full cursor-not-allowed place-items-center rounded-xl text-sm font-medium'
                    : 'flex cursor-not-allowed items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium',
                  'text-foreground/30',
                )}
              >
                {collapsed ? (
                  <Icon className="h-4 w-4" strokeWidth={2} />
                ) : (
                  <>
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" strokeWidth={2} />
                      {item.label}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground/25">
                      Soon
                    </span>
                  </>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                collapsed
                  ? 'grid h-10 w-full place-items-center rounded-xl text-sm font-medium transition'
                  : 'group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition',
                active
                  ? 'bg-primary-soft text-primary'
                  : 'text-foreground/75 hover:bg-muted hover:text-foreground',
              )}
            >
              {collapsed ? (
                <Icon className="h-4 w-4" strokeWidth={2} />
              ) : (
                <>
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                    {item.label}
                  </span>
                  {active && <ChevronRight className="h-4 w-4 opacity-60" />}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Session card — shows which data you're looking at, and signs out. */}
      {!collapsed && (
        <div className="mt-auto flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2 shadow-soft">
          <span
            className={cn(
              'h-2 w-2 flex-shrink-0 rounded-full',
              live ? 'bg-emerald-500' : 'bg-amber-400',
            )}
          />
          <Link to="/connect" className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-semibold">
              {live ? roleLabel(me.data?.user?.role) : 'Demo mode'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {live
                ? (me.data?.user?.name ?? me.data?.user?.email ?? label)
                : 'Sample data only'}
            </p>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </aside>
  )
}

/** Layout route component — pages render through <Outlet />. */
export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { ready, mode } = useAccess()
  const navigate = useNavigate()

  // Close the drawer on navigation.
  useEffect(() => setMobileOpen(false), [pathname])

  // Gate: no session -> sign in. Deferred until `ready` because the
  // server render can't see localStorage and would bounce everyone.
  useEffect(() => {
    if (ready && !mode) navigate({ to: '/login' })
  }, [ready, mode, navigate])

  if (!ready || !mode) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar mobileOpen={mobileOpen} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-border-soft bg-sidebar px-4 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
            className="-ml-2 grid h-9 w-9 place-items-center rounded-md hover:bg-muted"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold tracking-tight">Genisys</span>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
