import { createClient } from '@supabase/supabase-js'
import { generateUniqueClaimCode } from '@/lib/lodges/claim-code'
import { generateUniqueLodgeSlug } from '@/lib/lodges/slug'
import { sendLodgeClaimEmail } from '@/lib/email'

const FOUNDING_LIMIT = parseInt(process.env.NEXT_PUBLIC_FOUNDING_LODGE_LIMIT || '10')

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

  // Assign tier server-side — never trust frontend
  const { count: foundingCount } = await supabase
    .from('lodges')
    .select('*', { count: 'exact', head: true })
    .eq('tier', 'founding')
    .eq('status', 'active')

  const tier = (foundingCount ?? 0) < FOUNDING_LIMIT ? 'founding' : 'charter'
  const claimCode = await generateUniqueClaimCode(supabase)
  const slug = await generateUniqueLodgeSlug(supabase, meta.lodge_name, meta.lodge_number)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  const { error: updateError } = await supabase
    .from('lodges')
    .update({
      status: 'active',
      tier,
      paid_at: new Date().toISOString(),
      claim_code: claimCode,
      claim_code_expires_at: expiresAt.toISOString(),
      stripe_session_id: session.id,
      slug,
    })
    .eq('id', meta.lodge_id)

  if (updateError) {
    console.error('Failed to activate lodge:', updateError)
    return Response.json({ received: true })
  }

  try {
    await sendLodgeClaimEmail({
      to: meta.payer_email,
      payerName: meta.payer_name,
      lodgeName: meta.lodge_name,
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
