import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

/**
 * TanStack Start looks for a `getRouter` export here (it's the
 * "#tanstack-router-entry" module) — renaming it breaks hydration.
 */
export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
