import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Clock, Loader2, ShieldAlert } from 'lucide-react'
import {
  DEFAULT_HUB,
  enterDemoMode,
  getMode,
  loginWithPassword,
} from '@/lib/api'
import {
  AuthLayout,
  authInput,
  authLabel,
  authLabelText,
  authSubmit,
} from '@/components/auth-layout'

/**
 * Sign in with a Genisys account.
 *
 * The Hub verifies the credentials and returns a session token; without
 * one it serves no data at all, so this gates data rather than just
 * hiding the UI.
 */
export default function Login() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [hubUrl, setHubUrl] = useState(DEFAULT_HUB)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (getMode()) navigate({ to: '/' })
  }, [navigate])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setPending(false)

    const result = await loginWithPassword(hubUrl, email, password)
    if (!result.ok) {
      setError(result.message)
      setPending(result.pending ?? false)
      setBusy(false)
      return
    }

    queryClient.invalidateQueries()
    navigate({ to: '/' })
  }

  const demo = () => {
    enterDemoMode()
    queryClient.invalidateQueries()
    navigate({ to: '/' })
  }

  return (
    <AuthLayout
      title="Genisys CRM"
      subtitle="Sign in to your account."
      footer={
        <>
          <p className="text-xs text-muted-foreground">
            Need an account?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Request access
            </Link>
          </p>
          <button
            type="button"
            onClick={demo}
            className="mt-3 text-xs font-medium text-primary hover:underline"
          >
            Explore with demo data instead
          </button>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Sample data only — nothing is read from the Hub.
          </p>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className="flex flex-col gap-3">
          <label className={authLabel}>
            <span className={authLabelText}>Email</span>
            <input
              autoFocus
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@leadgenisys.com"
              className={authInput}
            />
          </label>

          <label className={authLabel}>
            <span className={authLabelText}>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              className={authInput}
            />
          </label>
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground hover:text-foreground">
            Advanced
          </summary>
          <label className={`mt-2 ${authLabel}`}>
            <span className={authLabelText}>Hub URL</span>
            <input
              value={hubUrl}
              onChange={(e) => setHubUrl(e.target.value)}
              className={authInput}
            />
          </label>
        </details>

        {error && (
          <div
            className={
              pending
                ? 'mt-3 flex items-start gap-2 rounded-xl border border-amber-300/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300'
                : 'mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive'
            }
          >
            {pending ? (
              <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" />
            ) : (
              <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
            )}
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !email.trim() || !password}
          className={authSubmit}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  )
}
