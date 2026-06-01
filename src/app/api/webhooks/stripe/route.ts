import { createClient } from '@supabase/supabase-js'
import { generateUniqueClaimCode } from '@/lib/lodges/claim-code'
import { generateUniqueLodgeSlug } from '@/lib/lodges/slug'
import { sendLodgeClaimEmail } from '@/lib/email'
import { INVITE_CAPS } from '@/lib/invites'
import { getFoundingOffer } from '@/lib/pricing'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: 'Stripe not configured' }, { status: 501 })
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return Response.json({ received: true })
  }

  const session = event.data.object
  const meta = session.metadata!
  const supabase = adminClient()

  // Handle upgrade checkouts separately
  if (meta.upgrade === 'true') {
    const newTier = meta.to_tier
    const newCap = INVITE_CAPS[newTier] ?? null
    await supabase.from('lodges').update({
      tier:                        newTier,
      invite_cap:                  newCap,
      upgraded_at:                 new Date().toISOString(),
      upgrade_stripe_session_id:   session.id,
    }).eq('id', meta.lodge_id)
    return Response.json({ received: true })
  }

  // Assign tier server-side at payment time — never trust the client
  const { offer: foundingOffer } = await getFoundingOffer(supabase)
  const size = meta.lodge_size as string

  const tier = foundingOffer
    ? foundingOffer.lodgeTier
    : size === 'small'
      ? 'small'
      : size === 'large'
        ? 'large'
        : 'standard'

  const inviteCap = INVITE_CAPS[tier] ?? null

  const claimCode = await generateUniqueClaimCode(supabase)
  const slug = await generateUniqueLodgeSlug(supabase, meta.lodge_name, meta.lodge_number)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  const { error: updateError } = await supabase
    .from('lodges')
    .update({
      status:                'active',
      tier,
      original_tier:         tier,
      invite_cap:            inviteCap,
      invites_sent:          0,
      paid_at:               new Date().toISOString(),
      paid_by_email:         (meta.payer_email ?? session.customer_email ?? '').toLowerCase().trim() || null,
      paid_by_name:          meta.payer_name ?? null,
      claim_code:            claimCode,
      claim_code_expires_at: expiresAt.toISOString(),
      stripe_session_id:     session.id,
      slug,
    })
    .eq('id', meta.lodge_id)

  if (updateError) {
    console.error('Failed to activate lodge:', updateError)
    return Response.json({ received: true })
  }

  try {
    await sendLodgeClaimEmail({
      to:          meta.payer_email,
      payerName:   meta.payer_name,
      lodgeName:   meta.lodge_name,
      lodgeNumber: meta.lodge_number,
      claimCode,
      tier,
      expiresAt,
    })
  } catch (emailErr) {
    console.error('Claim email failed after Stripe payment:', emailErr)
  }

  return Response.json({ received: true })
}
