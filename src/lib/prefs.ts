import { useCallback, useEffect, useState } from 'react'

/**
 * Per-user UI preferences.
 *
 * Cosmetic only, and deliberately client-side: hiding a tab hides the
 * link, not the data — every endpoint still enforces its own permissions.
 * If these ever need to mean "cannot access", they have to move to the
 * Hub and be checked server-side. Treating a local preference as a
 * security boundary is how people end up surprised.
 *
 * Keyed by account so two people sharing a browser don't inherit each
 * other's layout.
 */

export type Prefs = {
  hiddenTabs: string[]
  density: 'comfortable' | 'compact'
  sidebarDefault: 'expanded' | 'collapsed'
}

export const DEFAULT_PREFS: Prefs = {
  hiddenTabs: [],
  density: 'comfortable',
  sidebarDefault: 'expanded',
}

const keyFor = (who: string) => `genisys.prefs.${who || 'demo'}`

export function readPrefs(who: string): Prefs {
  try {
    const raw = localStorage.getItem(keyFor(who))
    if (!raw) return DEFAULT_PREFS
    const parsed = JSON.parse(raw) as Partial<Prefs>
    return {
      hiddenTabs: Array.isArray(parsed.hiddenTabs) ? parsed.hiddenTabs : [],
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      sidebarDefault:
        parsed.sidebarDefault === 'collapsed' ? 'collapsed' : 'expanded',
    }
  } catch {
    return DEFAULT_PREFS
  }
}

export function writePrefs(who: string, prefs: Prefs) {
  try {
    localStorage.setItem(keyFor(who), JSON.stringify(prefs))
    // Same-tab listeners: the storage event only fires in *other* tabs, so
    // without this the sidebar wouldn't react until a reload.
    window.dispatchEvent(new CustomEvent('genisys:prefs'))
  } catch {
    /* storage blocked — preferences just won't persist */
  }
}

/**
 * SSR-safe preferences hook. Starts at defaults so the server render and
 * first client render agree, then loads real values after mount.
 */
export function usePrefs(who: string) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setPrefs(readPrefs(who))
    setReady(true)

    const sync = () => setPrefs(readPrefs(who))
    window.addEventListener('genisys:prefs', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('genisys:prefs', sync)
      window.removeEventListener('storage', sync)
    }
  }, [who])

  const update = useCallback(
    (patch: Partial<Prefs>) => {
      setPrefs((cur) => {
        const next = { ...cur, ...patch }
        writePrefs(who, next)
        return next
      })
    },
    [who],
  )

  return { prefs, update, ready }
}
