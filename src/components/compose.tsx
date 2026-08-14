import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, Minus, Send, Trash2, X } from 'lucide-react'
import { fetchMailAccounts, sendMail } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Gmail-style compose window.
 *
 * Docked bottom-right and minimisable rather than a modal, because
 * writing an email usually means looking something up in the list behind
 * it — a modal would force you to discard the draft to go and check.
 */
export function ComposeWindow({
  live,
  onClose,
  initialTo = '',
  initialSubject = '',
}: {
  live: boolean
  onClose: () => void
  initialTo?: string
  initialSubject?: string
}) {
  const [minimised, setMinimised] = useState(false)
  const [to, setTo] = useState(initialTo)
  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState('')
  const [from, setFrom] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const accounts = useQuery({
    queryKey: ['mail-accounts'],
    queryFn: fetchMailAccounts,
    enabled: live,
  })

  const list = accounts.data?.accounts ?? []
  const activeFrom = from || list[0]?.email || ''

  const send = useMutation({
    mutationFn: async () => {
      const r = await sendMail({
        from: activeFrom,
        to: to.trim(),
        subject: subject.trim(),
        body,
      })
      if (!r.ok) throw new Error(r.error ?? 'Send failed.')
    },
    onSuccess: () => {
      setSent(true)
      setError(null)
      // Leave the confirmation up briefly so it registers as sent.
      setTimeout(onClose, 1200)
    },
    onError: (e) =>
      setError(e instanceof Error ? e.message : 'Could not send.'),
  })

  const discard = () => {
    if (
      (to.trim() || subject.trim() || body.trim()) &&
      !window.confirm('Discard this draft?')
    )
      return
    onClose()
  }

  if (minimised) {
    return (
      <div className="fixed bottom-0 right-6 z-50 w-[320px] rounded-t-xl border border-border bg-card shadow-pop">
        <button
          type="button"
          onClick={() => setMinimised(false)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
        >
          <span className="truncate text-sm font-semibold">
            {subject.trim() || 'New message'}
          </span>
          <X
            className="h-4 w-4 flex-shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              discard()
            }}
          />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 right-6 z-50 flex w-[min(540px,calc(100vw-3rem))] flex-col rounded-t-xl border border-border bg-card shadow-pop">
      <div className="flex items-center justify-between gap-2 rounded-t-xl bg-surface-muted px-3 py-2">
        <span className="truncate text-sm font-semibold">
          {sent ? 'Sent' : 'New message'}
        </span>
        <div className="flex flex-shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setMinimised(true)}
            aria-label="Minimise"
            className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={discard}
            aria-label="Close"
            className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col">
        {list.length > 1 && (
          <label className="flex items-center gap-2 border-b border-border-soft px-3 py-2 text-sm">
            <span className="w-14 flex-shrink-0 text-xs text-muted-foreground">
              From
            </span>
            <select
              value={activeFrom}
              onChange={(e) => setFrom(e.target.value)}
              className="flex-1 bg-transparent text-sm focus:outline-none"
            >
              {list.map((a) => (
                <option key={a.email} value={a.email}>
                  {a.email}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex items-center gap-2 border-b border-border-soft px-3 py-2">
          <span className="w-14 flex-shrink-0 text-xs text-muted-foreground">
            To
          </span>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            disabled={!live}
            placeholder="name@example.com"
            className="flex-1 bg-transparent text-sm focus:outline-none disabled:opacity-60"
          />
        </label>

        <label className="flex items-center gap-2 border-b border-border-soft px-3 py-2">
          <span className="w-14 flex-shrink-0 text-xs text-muted-foreground">
            Subject
          </span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={!live}
            placeholder="Subject"
            className="flex-1 bg-transparent text-sm focus:outline-none disabled:opacity-60"
          />
        </label>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={!live}
          rows={10}
          placeholder={live ? 'Write your message…' : 'Sign in to send email'}
          className="resize-y bg-transparent px-3 py-3 text-sm focus:outline-none disabled:opacity-60"
        />
      </div>

      {error && (
        <p className="mx-3 mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border-soft px-3 py-2.5">
        <button
          type="button"
          disabled={!live || !to.trim() || send.isPending || sent}
          onClick={() => send.mutate()}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:bg-primary/90 disabled:opacity-40',
          )}
        >
          {send.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {sent ? 'Sent' : send.isPending ? 'Sending…' : 'Send'}
        </button>

        <button
          type="button"
          onClick={discard}
          aria-label="Discard draft"
          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {!live && (
        <p className="border-t border-border-soft px-3 py-2 text-[11px] text-muted-foreground">
          Demo mode cannot send email.
        </p>
      )}
    </div>
  )
}
