import { useCallback, useEffect, useState } from 'react'

/**
 * Per-user UI preferences.
 *
 * Cosmetic only, and deliberately client-side: hiding a tab hides the
 * link, not the data — every endpoint still enforces its own permissions.
 * If these ever need to mean "cannot access", they have to move to the
 * Hub and be checked server-side. A local preference is not a boundary.
 *
 * Keyed by account so two people sharing a browser don't inherit each
 * other's layout.
 *
 * Every setting here must visibly do something. An earlier version stored
 * a "sidebar default" (already available from the collapse button) and a
 * density value that nothing read — controls that look functional and
 * aren't are worse than no controls, because they cost trust.
 */

export type Theme = 'light' | 'dark' | 'system'
export type Density = 'comfortable' | 'compact'

export type Prefs = {
  hiddenTabs: string[]
  /**
   * Sidebar order, as tab paths. Partial by design: anything missing
   * keeps its natural position after the listed items, so a newly added
   * tab still appears for someone who reordered months ago instead of
   * silently vanishing.
   */
  tabOrder: string[]
  density: Density
  theme: Theme
}

export const DEFAULT_PREFS: Prefs = {
  hiddenTabs: [],
  tabOrder: [],
  density: 'comfortable',
  theme: 'system',
}

const keyFor = (who: string) => `genisys.prefs.${who || 'demo'}`

export function readPrefs(who: string): Prefs {
  try {
    const raw = localStorage.getItem(keyFor(who))
    if (!raw) return { ...DEFAULT_PREFS, theme: readLegacyTheme() }
    const parsed = JSON.parse(raw) as Partial<Prefs>
    return {
      hiddenTabs: Array.isArray(parsed.hiddenTabs) ? parsed.hiddenTabs : [],
      tabOrder: Array.isArray(parsed.tabOrder) ? parsed.tabOrder : [],
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      theme:
        parsed.theme === 'light' || parsed.theme === 'dark'
          ? parsed.theme
          : parsed.theme === 'system'
            ? 'system'
            : readLegacyTheme(),
    }
  } catch {
    return DEFAULT_PREFS
  }
}

/** The sidebar toggle wrote a bare 'theme' key before this existed. */
function readLegacyTheme(): Theme {
  try {
    const t = localStorage.getItem('theme')
    return t === 'dark' || t === 'light' ? t : 'system'
  } catch {
    return 'system'
  }
}

export function writePrefs(who: string, prefs: Prefs) {
  try {
    localStorage.setItem(keyFor(who), JSON.stringify(prefs))
    // The storage event only fires in *other* tabs, so same-tab listeners
    // need an explicit nudge or the UI won't react until a reload.
    window.dispatchEvent(new CustomEvent('genisys:prefs'))
  } catch {
    /* storage blocked — preferences just won't persist */
  }
}

/** Does this theme resolve to dark right now? SSR-safe. */
export function isDarkTheme(theme: Theme): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** Resolve `system` against the OS setting and apply it to <html>. */
export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const dark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  try {
    // Kept in sync so the no-flash bootstrap in index.html still works.
    if (theme === 'system') localStorage.removeItem('theme')
    else localStorage.setItem('theme', theme)
  } catch {
    /* ignore */
  }
}

/**
 * Apply a saved order to a nav list.
 *
 * Items named in `order` come first in that order; everything else keeps
 * its original relative position afterwards. That way the list survives
 * tabs being added or removed without the preference needing migration.
 */
export function applyTabOrder<T extends { to: string }>(
  items: T[],
  order: string[],
): T[] {
  if (order.length === 0) return items
  const rank = new Map(order.map((to, i) => [to, i]))
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => {
      const ra = rank.get(a.item.to)
      const rb = rank.get(b.item.to)
      if (ra !== undefined && rb !== undefined) return ra - rb
      // Unranked items stay put relative to each other, and sort after
      // ranked ones.
      if (ra !== undefined) return -1
      if (rb !== undefined) return 1
      return a.i - b.i
    })
    .map((x) => x.item)
}

/** Density is a data attribute; styles.css does the rest. */
export function applyDensity(density: Density) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-density', density)
}

/**
 * SSR-safe preferences hook. Starts at defaults so the server render and
 * the first client render agree, then loads real values after mount.
 */
export function usePrefs(who: string) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const loaded = readPrefs(who)
    setPrefs(loaded)
    applyTheme(loaded.theme)
    applyDensity(loaded.density)
    setReady(true)

    const sync = () => {
      const next = readPrefs(who)
      setPrefs(next)
      applyTheme(next.theme)
      applyDensity(next.density)
    }
    window.addEventListener('genisys:prefs', sync)
    window.addEventListener('storage', sync)

    // Follow the OS when set to system.
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onScheme = () => {
      if (readPrefs(who).theme === 'system') applyTheme('system')
    }
    mq.addEventListener('change', onScheme)

    return () => {
      window.removeEventListener('genisys:prefs', sync)
      window.removeEventListener('storage', sync)
      mq.removeEventListener('change', onScheme)
    }
  }, [who])

  const update = useCallback(
    (patch: Partial<Prefs>) => {
      setPrefs((cur) => {
        const next = { ...cur, ...patch }
        writePrefs(who, next)
        if (patch.theme) applyTheme(next.theme)
        if (patch.density) applyDensity(next.density)
        return next
      })
    },
    [who],
  )

  return { prefs, update, ready }
}
