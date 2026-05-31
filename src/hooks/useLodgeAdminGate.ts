'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export interface LodgeSummary {
  id: string
  name: string
  number: string
  state: string
  city: string
  slug: string | null
  tier: string
}

export function useLodgeAdminGate() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lodge, setLodge] = useState<LodgeSummary | null>(null)
  const [lodgeId, setLodgeId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?redirect=/admin')
        return
      }
      setCurrentUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('lodge_id, is_lodge_admin, is_co_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.lodge_id || (!profile.is_lodge_admin && !profile.is_co_admin)) {
        setError("You don't have admin access to any lodge.")
        setLoading(false)
        return
      }

      setLodgeId(profile.lodge_id)

      const { data: lodgeData } = await supabase
        .from('lodges')
        .select('id, name, number, state, city, slug, tier')
        .eq('id', profile.lodge_id)
        .single()

      if (lodgeData) setLodge(lodgeData as LodgeSummary)
      setLoading(false)
    }
    load()
  }, [router])

  return { loading, error, lodge, lodgeId, currentUserId }
}
