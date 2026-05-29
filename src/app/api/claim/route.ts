import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function resolveDisplayName(
  existingName: string | null | undefined,
  userMetadata: Record<string, unknown> | undefined,
  paidByName: string | null | undefined
): string | null {
  if (existingName?.trim()) return existingName.trim()
  const meta =
    (userMetadata?.full_name as string) ||
    (userMetadata?.name as string) ||
    null
  if (meta?.trim()) return meta.trim()
  if (paidByName?.trim()) return paidByName.trim()
  return null
}

export async function POST(request: Request) {
  const { claimCode } = await request.json()
  const trimmed = (claimCode as string)?.trim().toUpperCase()

  if (!trimmed) {
    return Response.json({ error: 'Claim code required' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'NOT_AUTHENTICATED' }, { status: 401 })
  }

  const admin = adminClient()

  const { data: lodge } = await admin
    .from('lodges')
    .select('id, name, number, status, claim_code_expires_at, claim_code_claimed_at, paid_by_name, paid_by_email')
    .eq('claim_code', trimmed)
    .eq('status', 'active')
    .maybeSingle()

  if (!lodge) {
    return Response.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  if (lodge.claim_code_claimed_at) {
    return Response.json({ error: 'ALREADY_CLAIMED' }, { status: 409 })
  }

  if (lodge.claim_code_expires_at && new Date(lodge.claim_code_expires_at) < new Date()) {
    return Response.json({ error: 'EXPIRED' }, { status: 410 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  const fullName = resolveDisplayName(
    profile?.full_name,
    user.user_metadata,
    lodge.paid_by_name
  )

  const now = new Date().toISOString()

  const { error: profileError } = await admin
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email ?? profile?.email ?? lodge.paid_by_email,
      full_name: fullName,
      lodge_id: lodge.id,
      is_lodge_admin: true,
      verification_status: 'verified',
    }, { onConflict: 'id' })

  if (profileError) {
    console.error('Claim profile error:', profileError)
    return Response.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  const { error: lodgeError } = await admin
    .from('lodges')
    .update({ claim_code_claimed_at: now, claim_code_claimed_by: user.id })
    .eq('id', lodge.id)

  if (lodgeError) {
    console.error('Claim lodge error:', lodgeError)
    return Response.json({ error: 'Failed to update lodge' }, { status: 500 })
  }

  return Response.json({
    lodge: { id: lodge.id, name: lodge.name, number: lodge.number },
  })
}
