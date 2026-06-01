import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

const FOUNDING_LIMIT = parseInt(process.env.NEXT_PUBLIC_FOUNDING_LODGE_LIMIT || '10')

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const number = searchParams.get('number')?.trim()
  const state = searchParams.get('state')?.trim()

  if (searchParams.has('_founding')) {
    const { count } = await supabase
      .from('lodges')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'founding')
      .eq('status', 'active')
    return Response.json({ foundingCount: count ?? 0, limit: FOUNDING_LIMIT })
  }

  if (!number || !state) {
    return Response.json({ found: false })
  }

  const { data: lodge } = await supabase
    .from('lodges')
    .select('id, name, number, state, status, slug')
    .eq('number', number)
    .eq('state', state)
    .maybeSingle()

  if (!lodge) {
    return Response.json({ found: false })
  }

  return Response.json({
    found: true,
    status: lodge.status,
    name: lodge.name,
    number: lodge.number,
    state: lodge.state,
    slug: lodge.slug ?? lodge.id,
  })
}
