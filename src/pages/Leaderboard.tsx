import { Trophy } from 'lucide-react'
import { EmptyCard, PageHeader } from '@/components/ui'

/**
 * Leaderboard — placeholder.
 *
 * Greyed out for staff in the sidebar and reachable by admins only, so
 * there is somewhere to build into without showing reps a half-finished
 * ranking of themselves. Ranking people by numbers they can see before
 * the numbers are trustworthy is a bad first impression to make once.
 *
 * Blocked on the attribution question: until we know which rep booked a
 * given appointment, any ranking here would be a guess.
 */
export default function Leaderboard() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leaderboard"
        subtitle="Appointments booked, ranked. Not built yet."
        breadcrumbs={[{ label: 'Genisys' }, { label: 'Leaderboard' }]}
      />
      <EmptyCard icon={Trophy}>
        Nothing here yet. This waits on per-rep attribution — until we can
        tell which rep booked a given appointment, any ranking would be a
        guess. Run Diagnostics to check where that stands.
      </EmptyCard>
    </div>
  )
}
