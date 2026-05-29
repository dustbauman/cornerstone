import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')

  if (!sessionId) {
    return Response.json({ error: 'session_id required' }, { status: 400 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: 'Stripe not configured' }, { status: 501 })
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  let session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch {
    return Response.json({ error: 'Invalid session' }, { status: 404 })
  }

  if (session.payment_status !== 'paid') {
    return Response.json({ error: 'Payment not completed' }, { status: 402 })
  }

  const lodgeId = session.metadata?.lodge_id
  if (!lodgeId) {
    return Response.json({ error: 'Lodge not found in session' }, { status: 404 })
  }

  const supabase = createAdminClient()
  const { data: lodge } = await supabase
    .from('lodges')
    .select('name, number, claim_code, tier, paid_by_email, status')
    .eq('id', lodgeId)
    .maybeSingle()

  if (!lodge || lodge.status !== 'active') {
    return Response.json({ error: 'Lodge not active yet' }, { status: 404 })
  }

  return Response.json({
    lodgeName: lodge.name,
    lodgeNumber: lodge.number,
    claimCode: lodge.claim_code,
    tier: lodge.tier,
    payerEmail: lodge.paid_by_email ?? session.customer_email,
  })
}
