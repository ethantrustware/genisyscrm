import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, Loader2, ShieldAlert } from 'lucide-react'
import { DEFAULT_HUB, registerAccount } from '@/lib/api'
import {
  AuthLayout,
  authInput,
  authLabel,
  authLabelText,
  authSubmit,
} from '@/components/auth-layout'

const MIN_PASSWORD = 10

/**
 * Request an account.
 *
 * Signing up does not grant access — an admin approves first. This app
 * reads real client data from a shareable URL, so open signup would hand
 * that to anyone with the link.
 */
export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD
  const mismatch = confirm.length > 0 && confirm !== password
  const valid =
    name.trim() &&
    email.trim() &&
    password.length >= MIN_PASSWORD &&
    confirm === password

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)

    const result = await registerAccount(DEFAULT_HUB, name, email, password)
    setBusy(false)

    if (!result.ok) {
      setError(result.message)
      return
    }
    setDone(result.message)
  }

  if (done) {
    return (
      <AuthLayout
        title="Request sent"
        subtitle="Your account needs approval before you can sign in."
        footer={
          <Link to="/login" className="text-xs font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{done}</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          An admin has been notified. Once approved, sign in with the email and
          password you just chose.
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Request access"
      subtitle="Create an account for the Genisys CRM."
      footer={
        <p className="text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={submit}>
        <div className="flex flex-col gap-3">
          <label className={authLabel}>
            <span className={authLabelText}>Full name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className={authInput}
            />
          </label>

          <label className={authLabel}>
            <span className={authLabelText}>Work email</span>
            <input
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`At least ${MIN_PASSWORD} characters`}
              className={authInput}
            />
            {tooShort && (
              <span className="text-[11px] text-destructive">
                Must be at least {MIN_PASSWORD} characters.
              </span>
            )}
          </label>

          <label className={authLabel}>
            <span className={authLabelText}>Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={authInput}
            />
            {mismatch && (
              <span className="text-[11px] text-destructive">
                Passwords do not match.
              </span>
            )}
          </label>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={busy || !valid} className={authSubmit}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? 'Sending…' : 'Request access'}
        </button>

        <p className="mt-3 text-[11px] text-muted-foreground">
          Accounts are reviewed by an admin before they can sign in.
        </p>
      </form>
    </AuthLayout>
  )
}
