import { createClient } from '@supabase/supabase-js'
import { generateUniqueClaimCode } from '@/lib/lodges/claim-code'
import { sendLodgeClaimEmail } from '@/lib/email'

const FOUNDING_LIMIT = parseInt(process.env.NEXT_PUBLIC_FOUNDING_LODGE_LIMIT || '10')

const PRICES: Record<string, number> = {
  small: 299,
  standard: 499,
  large: 799,
  founding: 1,
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const body = await request.json()
  const { lodgeName, lodgeNumber, state, size, payerName, payerEmail, directoryId } = body

  if (!lodgeName || !lodgeNumber || !state || !size || !payerEmail) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = adminClient()

  // Server-side duplicate check
  const { data: existing } = await supabase
    .from('lodges')
    .select('id, status, name')
    .eq('number', lodgeNumber)
    .eq('state', state)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'active') {
      return Response.json({ error: 'LODGE_ALREADY_EXISTS', message: `${existing.name} is already on Tyrian.` }, { status: 409 })
    }
    if (existing.status === 'pending') {
      return Response.json({ error: 'LODGE_PAYMENT_PENDING', message: 'A payment for this lodge is already in progress.' }, { status: 409 })
    }
  }

  // Determine founding eligibility (server-side only)
  const { count: foundingCount } = await supabase
    .from('lodges')
    .select('*', { count: 'exact', head: true })
    .eq('tier', 'founding')
    .eq('status', 'active')

  const isFoundingEligible = (foundingCount ?? 0) < FOUNDING_LIMIT

  // Create pending lodge
  const { data: lodge, error: lodgeError } = await supabase
    .from('lodges')
    .insert({
      name: lodgeName,
      number: lodgeNumber,
      state: state,
      city: '',
      status: 'pending',
      tier: 'standard',
      paid_by_email: payerEmail,
      paid_by_name: payerName,
      directory_id: directoryId || null,
    })
    .select()
    .single()

  if (lodgeError) {
    if (lodgeError.code === '23505') {
      return Response.json({ error: 'LODGE_ALREADY_EXISTS', message: 'This lodge is already registered.' }, { status: 409 })
    }
    console.error('Lodge insert error:', lodgeError)
    return Response.json({ error: 'Failed to create lodge' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // ── Stripe path ──────────────────────────────────────────────────────────
  if (process.env.STRIPE_SECRET_KEY) {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    let priceId: string
    if (isFoundingEligible) {
      priceId = process.env.STRIPE_PRICE_FOUNDING!
    } else {
      const priceMap: Record<string, string> = {
        small:    process.env.STRIPE_PRICE_STANDARD_SMALL!,
        standard: process.env.STRIPE_PRICE_STANDARD!,
        large:    process.env.STRIPE_PRICE_LARGE!,
      }
      priceId = priceMap[size] || process.env.STRIPE_PRICE_STANDARD!
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        lodge_id: lodge.id,
        lodge_name: lodgeName,
        lodge_number: lodgeNumber,
        lodge_state: state,
        lodge_size: size,
        payer_email: payerEmail,
        payer_name: payerName,
        is_founding_eligible: String(isFoundingEligible),
      },
      customer_email: payerEmail,
      success_url: `${appUrl}/join/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/join/confirm`,
      expires_at: Math.floor(Date.now() / 1000) + 2 * 60 * 60,
    })

    return Response.json({ url: session.url })
  }

  // ── Stub path (no Stripe key) — activate directly ───────────────────────
  const tier = isFoundingEligible ? 'founding' : 'charter'
  const claimCode = await generateUniqueClaimCode(supabase)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)
  const amount = isFoundingEligible ? PRICES.founding : PRICES[size] ?? PRICES.standard

  await supabase
    .from('lodges')
    .update({
      status: 'active',
      tier,
      paid_at: new Date().toISOString(),
      claim_code: claimCode,
      claim_code_expires_at: expiresAt.toISOString(),
    })
    .eq('id', lodge.id)

  await sendLodgeClaimEmail({
    to: payerEmail,
    payerName: payerName || 'Brother',
    lodgeName,
    lodgeNumber,
    claimCode,
    tier,
    expiresAt,
  })

  const params = new URLSearchParams({
    lodge: lodgeName,
    number: lodgeNumber,
    code: claimCode,
    tier,
    amount: String(amount),
    email: payerEmail,
  })

  return Response.json({ url: `${appUrl}/join/success?${params}` })
}
