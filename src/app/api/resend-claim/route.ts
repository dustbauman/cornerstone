import { createClient } from '@supabase/supabase-js'
import { sendLodgeClaimEmail } from '@/lib/email'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const body = await request.json()
  const email = (body.email as string)?.toLowerCase().trim()

  if (!email) {
    return Response.json({ error: 'Email required' }, { status: 400 })
  }

  const supabase = adminClient()

  const { data: lodge } = await supabase
    .from('lodges')
    .select('*')
    .eq('paid_by_email', email)
    .eq('status', 'active')
    .is('claim_code_claimed_at', null)
    .maybeSingle()

  // Always return same response to prevent email enumeration
  if (lodge) {
    let claimCode = lodge.claim_code
    let expiresAt = new Date(lodge.claim_code_expires_at)

    const isExpired = lodge.claim_code_expires_at && expiresAt < new Date()
    if (isExpired) {
      const letters = Array.from({ length: 3 }, () =>
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
      ).join('')
      const digits = String(Math.floor(1000 + Math.random() * 9000))
      claimCode = `${letters}-${digits}`
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      await supabase
        .from('lodges')
        .update({ claim_code: claimCode, claim_code_expires_at: expiresAt.toISOString() })
        .eq('id', lodge.id)
    }

    await sendLodgeClaimEmail({
      to: email,
      payerName: lodge.paid_by_name || 'Brother',
      lodgeName: lodge.name,
      lodgeNumber: lodge.number,
      claimCode,
      tier: lodge.tier,
      expiresAt,
    })
  }

  return Response.json({
    message: 'If an active lodge is associated with this email, the claim code has been resent.',
  })
}
