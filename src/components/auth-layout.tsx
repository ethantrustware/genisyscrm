import type { ReactNode } from 'react'
import { LayoutGrid } from 'lucide-react'

/** Centred card used by both the sign-in and sign-up screens. */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <LayoutGrid className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          {children}
        </div>

        {footer && <div className="mt-4 text-center">{footer}</div>}
      </div>
    </div>
  )
}

export const authInput =
  'w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export const authLabel = 'flex flex-col gap-1.5'

export const authLabelText = 'text-xs font-semibold'

export const authSubmit =
  'mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:bg-primary/90 disabled:opacity-50'
