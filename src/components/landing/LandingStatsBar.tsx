'use client'

import { useDemoMode } from '@/lib/demo/context'
import { DEMO_LANDING_STAT_ITEMS } from '@/lib/demo/stats'
import type { LandingStats } from '@/lib/db/stats'

interface Props {
  liveStats: LandingStats
}

export default function LandingStatsBar({ liveStats }: Props) {
  const { isDemoMode } = useDemoMode()

  const statItems = isDemoMode
    ? [...DEMO_LANDING_STAT_ITEMS]
    : [
        { value: liveStats.professionals.toLocaleString('en-US'), label: 'Verified Professionals' },
        { value: liveStats.lodges.toLocaleString('en-US'), label: 'Lodges on the Network' },
        { value: liveStats.states.toLocaleString('en-US'), label: 'States Covered' },
        { value: liveStats.openRequests.toLocaleString('en-US'), label: 'Open Requests' },
      ]

  return (
    <section className="bg-navy-dark text-white border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {statItems.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-serif text-3xl font-bold text-gold">{s.value}</div>
              <div className="text-white/50 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
        <p className="text-center text-white/30 text-xs mt-6">
          Growing across Florida, Oklahoma, and beyond.
        </p>
      </div>
    </section>
  )
}
