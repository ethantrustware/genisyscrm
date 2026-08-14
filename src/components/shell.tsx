import { useEffect, useState } from 'react'
import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import {
  Building2,
  CalendarCheck,
  ChevronRight,
  LayoutGrid,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Sun,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsLive } from '@/lib/api'

/**
 * App shell — a port of the Hub's sidebar + layout, class-for-class, so
 * this app reads as the same product rather than a lookalike.
 *
 * This route is server-rendered, so every browser-only value starts at a
 * neutral default and is corrected in an effect after mount. Reading
 * localStorage during render would disagree with the server markup.
 */

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid },
  { to: '/clients', label: 'Clients', icon: Building2 },
  { to: '/appointments', label: 'Appointments', icon: CalendarCheck },
  { to: '/connect', label: 'Connect', icon: Plug },
]

function useTheme() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      /* storage blocked — theme just won't persist */
    }
  }

  return { dark, toggle }
}

function Sidebar({ mobileOpen }: { mobileOpen: boolean }) {
  const [collapsed, setCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const { dark, toggle } = useTheme()
  const live = useIsLive()

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
        {NAV.map((item) => {
          const Icon = item.icon
          const active =
            item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)
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

      {/* Data-source indicator — makes it obvious whether you're looking
          at mock data or the real Hub. */}
      {!collapsed && (
        <Link
          to="/connect"
          className="mt-auto flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2 shadow-soft transition hover:bg-muted"
        >
          <span
            className={cn(
              'h-2 w-2 flex-shrink-0 rounded-full',
              live ? 'bg-emerald-500' : 'bg-amber-400',
            )}
          />
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-semibold">
              {live ? 'Live data' : 'Demo data'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {live ? 'Connected to Hub' : 'Not connected'}
            </p>
          </div>
        </Link>
      )}
    </aside>
  )
}

/** Layout route component — pages render through <Outlet />. */
export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // Close the drawer on navigation.
  useEffect(() => setMobileOpen(false), [pathname])

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
