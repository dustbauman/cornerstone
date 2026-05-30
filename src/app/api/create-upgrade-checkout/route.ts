import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { INVITE_CAPS } from '@/lib/invites'

// Difference amounts in cents
const UPGRADE_PRICES: Record<string, number> = {
  small_to_standard: 20000,   // $299 → $499
  small_to_large:    50000,   // $299 → $799
  standard_to_large: 30000,   // $499 → $799
}

export async function POST(request: Request) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { lodgeId, fromTier, toTier, price } = body

  if (!lodgeId || !fromTier || !toTier) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify caller is an admin of this lodge
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('lodge_id, is_lodge_admin, is_co_admin')
    .eq('id', user.id)
    .single()

  if (!profile || profile.lodge_id !== lodgeId || (!profile.is_lodge_admin && !profile.is_co_admin)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const key = `${fromTier}_to_${toTier}`
  const amountCents = UPGRADE_PRICES[key]
  if (!amountCents) {
    return Response.json({ error: 'Invalid upgrade path' }, { status: 400 })
  }

  const { data: lodge } = await admin
    .from('lodges')
    .select('name, number, state')
    .eq('id', lodgeId)
    .single()

  if (!lodge) return Response.json({ error: 'Lodge not found' }, { status: 404 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!process.env.STRIPE_SECRET_KEY) {
    // Dev mode: apply upgrade directly
    const newCap = INVITE_CAPS[toTier] ?? null
    await admin.from('lodges').update({
      tier:        toTier,
      invite_cap:  newCap,
      upgraded_at: new Date().toISOString(),
    }).eq('id', lodgeId)

    return Response.json({ url: `${appUrl}/admin?upgraded=1` })
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: amountCents,
        product_data: {
          name: `Tyrian ${toTier.charAt(0).toUpperCase() + toTier.slice(1)} Plan — upgrade for ${lodge.name} #${lodge.number}`,
          description: `Upgrade from ${fromTier} to ${toTier}. Difference only — you already paid for ${fromTier}.`,
        },
      },
    }],
    metadata: {
      upgrade:    'true',
      lodge_id:   lodgeId,
      from_tier:  fromTier,
      to_tier:    toTier,
    },
    customer_email: user.email ?? undefined,
    success_url: `${appUrl}/admin?upgraded=1`,
    cancel_url:  `${appUrl}/admin/upgrade`,
  })

  return Response.json({ url: session.url })
}
