import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const state = searchParams.get('state')?.trim()

  if (!q && !state) {
    return Response.json({ results: [] })
  }

  let query = supabase
    .from('lodge_directory')
    .select('id, name, number, city, state, grand_lodge')
    .eq('is_active', true)
    .order('state')
    .order('number')
    .limit(10)

  if (state) query = query.eq('state', state)

  if (q) {
    if (/^\d+$/.test(q)) {
      query = query.eq('number', q)
    } else {
      query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%,number.ilike.%${q}%`)
    }
  }

  const { data, error } = await query

  if (error) {
    console.error('Lodge directory search error:', error)
    return Response.json({ results: [] }, { status: 500 })
  }

  return Response.json({ results: data || [] })
}
