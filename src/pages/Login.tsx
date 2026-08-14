import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { KeyRound, LayoutGrid, Loader2, ShieldAlert } from 'lucide-react'
import {
  DEFAULT_HUB,
  enterDemoMode,
  getMode,
  setConnection,
  setSessionLabel,
  testConnection,
} from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Sign-in gate.
 *
 * The access key is the real credential: it is verified against the Hub
 * before entry, and the Hub serves nothing without it. This screen is
 * therefore a genuine gate rather than a cosmetic one.
 *
 * "Explore demo" is a deliberate second door to mock data only, so the
 * UI can be designed without issuing a key that reads live client data.
 */
export default function Login() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [hubUrl, setHubUrl] = useState(DEFAULT_HUB)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Already signed in? Don't make them do it twice.
  useEffect(() => {
    if (getMode()) navigate({ to: '/' })
  }, [navigate])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)

    const result = await testConnection(hubUrl, token)
    if (!result.ok) {
      setError(result.message)
      setBusy(false)
      return
    }

    setConnection(hubUrl, token)
    setSessionLabel(result.message.replace(/^Connected as "?|"?\.$/g, ''))
    queryClient.invalidateQueries()
    navigate({ to: '/' })
  }

  const demo = () => {
    enterDemoMode()
    queryClient.invalidateQueries()
    navigate({ to: '/' })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <LayoutGrid className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <h1 className="text-[26px] font-semibold tracking-tight">
            Genisys CRM
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in with your access key to view live data.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-border bg-card p-5 shadow-card"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold">Access key</span>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your key"
                autoComplete="current-password"
                className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 font-mono text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </label>

          <details className="mt-3">
            <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground hover:text-foreground">
              Advanced
            </summary>
            <label className="mt-2 flex flex-col gap-1.5">
              <span className="text-xs font-semibold">Hub URL</span>
              <input
                value={hubUrl}
                onChange={(e) => setHubUrl(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </label>
          </details>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !token.trim()}
            className={cn(
              'mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:bg-primary/90 disabled:opacity-50',
            )}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? 'Verifying…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={demo}
            className="text-xs font-medium text-primary hover:underline"
          >
            Explore with demo data instead
          </button>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Sample data only — nothing is read from the Hub.
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Keys are issued from the Hub under Settings → API Tokens and are
          stored in this browser only.
        </p>
      </div>
    </div>
  )
}
