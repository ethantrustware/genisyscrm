import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { cn, initials } from '@/lib/utils'

/**
 * UI primitives ported from the Hub, class-for-class, so the two apps
 * look like one product. Class strings here are copied from the Hub's
 * components — if you restyle something, restyle it in both places.
 */

/* ---------- Page header ---------- */

export type Crumb = { label: string; href?: string }

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
}: {
  title: string
  subtitle?: string
  breadcrumbs?: Crumb[]
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="mb-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
          >
            {breadcrumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-2">
                {c.href ? (
                  <Link to={c.href} className="hover:text-foreground">
                    {c.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      i === breadcrumbs.length - 1 && 'text-foreground/70',
                    )}
                  >
                    {c.label}
                  </span>
                )}
                {i < breadcrumbs.length - 1 && (
                  <span aria-hidden className="opacity-60">
                    →
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  )
}

/* ---------- Cards ---------- */

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-4 shadow-soft',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="mt-2 text-[26px] font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

/* ---------- Chip ---------- */

export type ChipTone = 'pink' | 'amber' | 'mint' | 'blue' | 'violet' | 'muted'

const TONE_CLASS: Record<ChipTone, string> = {
  pink: 'chip-pink',
  amber: 'chip-amber',
  mint: 'chip-mint',
  blue: 'chip-blue',
  violet: 'chip-violet',
  muted: 'bg-muted text-muted-foreground',
}

export function Chip({
  children,
  tone = 'muted',
  className,
}: {
  children: ReactNode
  tone?: ChipTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Map the Hub's free-form status strings onto chip tones. */
export function statusTone(status: string): ChipTone {
  const s = status.toLowerCase()
  if (s === 'won' || s === 'showed' || s === 'confirmed') return 'mint'
  if (s === 'booked' || s === 'dispatched') return 'blue'
  if (s === 'rescheduled' || s.includes('reschedule') || s.includes('review'))
    return 'amber'
  if (s === 'no_show' || s === 'cancelled' || s === 'lost') return 'pink'
  return 'muted'
}

export function StatusChip({ status }: { status: string }) {
  return <Chip tone={statusTone(status)}>{status.replace(/_/g, ' ')}</Chip>
}

/* ---------- Avatar ---------- */

export function Avatar({
  name,
  color,
  size = 'md',
}: {
  name: string
  color?: string | null
  size?: 'sm' | 'md'
}) {
  return (
    <span
      className={cn(
        'inline-flex flex-shrink-0 items-center justify-center rounded-full font-semibold text-white',
        size === 'sm' ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-sm',
      )}
      style={{ backgroundColor: color ?? 'oklch(0.58 0.21 264)' }}
    >
      {initials(name)}
    </span>
  )
}

/* ---------- Buttons (pill, matching the Hub) ---------- */

export const btnPrimary =
  'inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:bg-primary/90 disabled:opacity-50'

export const btnSecondary =
  'inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-50'

export const inputCls =
  'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:opacity-50'

/* ---------- States ---------- */

export function Loading() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  )
}

export function ErrorCard({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-border bg-card p-6 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export function EmptyCard({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <Icon className="mx-auto mb-2 h-10 w-10 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  )
}

/** Section label used throughout the Hub. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  )
}
