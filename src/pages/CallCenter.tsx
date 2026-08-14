import { PhoneCall } from 'lucide-react'
import { EmptyCard, PageHeader } from '@/components/ui'

/**
 * Call Center — intentionally empty.
 *
 * Genisys no longer cold-calls homeowners for solar appointments, so
 * the numbers the old Hub call center reports describe a business that
 * stopped existing. Rather than port those metrics into this app and
 * give them a second life, this tab is a placeholder until the
 * contractor funnel is defined.
 *
 * Its Hub counterpart is /call-center-2, also blank, for the same
 * reason.
 */
export default function CallCenter() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Call Center"
        subtitle="Being rebuilt for the contractor model."
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Call Center' }]}
      />
      <EmptyCard icon={PhoneCall}>
        Nothing here yet. This tab is reserved for the new contractor
        funnel — it stays empty until the stages and numbers are agreed
        on, rather than showing figures left over from the solar model.
      </EmptyCard>
    </div>
  )
}
