'use client'

import { useEffect, useState } from 'react'
import { useDemoMode } from '@/lib/demo/context'
import { DEMO_LANDING_STAT_ITEMS } from '@/lib/demo/stats'
import { EMPTY_LANDING_STATS, type LandingStats } from '@/lib/db/stats'

export default function LandingStatsBar() {
  const { isDemoMode } = useDemoMode()
  const [stats, setStats] = useState<LandingStats>(EMPTY_LANDING_STATS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemoMode) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetch('/api/stats')
      .then(async (res) => {
        if (!res.ok) return EMPTY_LANDING_STATS
        return res.json() as Promise<LandingStats>
      })
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch(() => {
        if (!cancelled) setStats(EMPTY_LANDING_STATS)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isDemoMode])

  const statItems = isDemoMode
    ? [...DEMO_LANDING_STAT_ITEMS]
    : [
        { value: stats.professionals.toLocaleString('en-US'), label: 'Verified Professionals' },
        { value: stats.lodges.toLocaleString('en-US'), label: 'Lodges on the Network' },
        { value: stats.states.toLocaleString('en-US'), label: 'States Covered' },
        { value: stats.openRequests.toLocaleString('en-US'), label: 'Open Requests' },
      ]

  return (
    <section className="bg-navy-dark text-white border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {statItems.map((s) => (
            <div key={s.label} className="text-center">
              <div
                className={`font-serif text-3xl font-bold text-gold transition-opacity ${
                  loading && !isDemoMode ? 'opacity-40' : ''
                }`}
              >
                {loading && !isDemoMode ? '—' : s.value}
              </div>
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
