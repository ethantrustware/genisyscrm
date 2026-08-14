import { createFileRoute } from '@tanstack/react-router'
import Crm from '@/pages/Crm'

/**
 * Search params must be declared, or TanStack Router drops them and
 * useSearch returns an empty object — which is why deep-linking a contact
 * from an opportunity silently did nothing.
 */
export const Route = createFileRoute('/_app/crm')({
  validateSearch: (search: Record<string, unknown>) => ({
    contactId:
      typeof search.contactId === 'string' ? search.contactId : undefined,
    subAccount:
      typeof search.subAccount === 'string' ? search.subAccount : undefined,
    contactName:
      typeof search.contactName === 'string' ? search.contactName : undefined,
  }),
  component: Crm,
})
