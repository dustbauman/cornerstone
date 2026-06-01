import { generateUniqueClaimCode } from '@/lib/lodges/claim-code'
import { generateUniqueLodgeSlug } from '@/lib/lodges/slug'
import { enrichLodgeGeo } from '@/lib/lodges/geocode-lodge'
import { sendLodgeClaimEmail } from '@/lib/email'
import { createAdminClient } from '@/lib/supabase/admin'
import { INVITE_CAPS } from '@/lib/invites'
import {
  getFoundingOffer,
  getStripePriceIdForFoundingOffer,
  STANDARD_PRICES_DOLLARS,
} from '@/lib/pricing'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { lodgeName, lodgeNumber, state, size, payerName, payerEmail, directoryId } = body

    if (!lodgeName || !lodgeNumber || !state || !size || !payerEmail) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const normalizedPayerEmail = payerEmail.toLowerCase().trim()

    const supabase = createAdminClient()

    const { data: existing } = await supabase
      .from('lodges')
      .select('id, status, name, slug')
      .eq('number', lodgeNumber)
      .eq('state', state)
      .maybeSingle()

    if (existing?.status === 'active') {
      return Response.json(
        { error: 'LODGE_ALREADY_EXISTS', message: `${existing.name} is already on Tyrian.` },
        { status: 409 }
      )
    }

    const { offer: foundingOffer } = await getFoundingOffer(supabase)

    let lodge: { id: string; slug: string | null }

    if (existing?.status === 'pending') {
      lodge = existing
      await supabase
        .from('lodges')
        .update({
          paid_by_email: normalizedPayerEmail,
          paid_by_name: payerName,
          name: lodgeName,
        })
        .eq('id', existing.id)
    } else {
      const slug = await generateUniqueLodgeSlug(supabase, lodgeName, lodgeNumber)

      let city = ''
      let meetingAddress: string | null = null
      if (directoryId) {
        const { data: dirRow } = await supabase
          .from('lodge_directory')
          .select('city, meeting_address')
          .eq('id', directoryId)
          .maybeSingle()
        if (dirRow) {
          city = dirRow.city || ''
          meetingAddress = dirRow.meeting_address || null
        }
      }

      const { data: inserted, error: lodgeError } = await supabase
        .from('lodges')
        .insert({
          name: lodgeName,
          number: lodgeNumber,
          state,
          city,
          meeting_address: meetingAddress,
          status: 'pending',
          tier: 'standard',
          paid_by_email: normalizedPayerEmail,
          paid_by_name: payerName,
          directory_id: directoryId || null,
          slug,
        })
        .select('id, slug')
        .single()

      if (lodgeError) {
        if (lodgeError.code === '23505') {
          return Response.json(
            { error: 'LODGE_ALREADY_EXISTS', message: 'This lodge is already registered.' },
            { status: 409 }
          )
        }
        console.error('Lodge insert error:', lodgeError)
        return Response.json({ error: 'Failed to create lodge', message: lodgeError.message }, { status: 500 })
      }

      lodge = inserted

      void enrichLodgeGeo(supabase, {
        id: inserted.id,
        number: lodgeNumber,
        city,
        state,
        meeting_address: meetingAddress,
        directory_id: directoryId || null,
      })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    if (process.env.STRIPE_SECRET_KEY) {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

      let priceId: string | undefined
      if (foundingOffer) {
        priceId = getStripePriceIdForFoundingOffer(foundingOffer)
      } else {
        const priceMap: Record<string, string> = {
          small: process.env.STRIPE_PRICE_STANDARD_SMALL!,
          standard: process.env.STRIPE_PRICE_STANDARD!,
          large: process.env.STRIPE_PRICE_LARGE!,
        }
        priceId = priceMap[size] || process.env.STRIPE_PRICE_STANDARD!
      }

      if (!priceId) {
        return Response.json(
          {
            error: 'STRIPE_NOT_CONFIGURED',
            message: 'Payment is not fully configured. Contact support.',
          },
          { status: 503 }
        )
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
          payer_email: normalizedPayerEmail,
          payer_name: payerName,
          founding_program: foundingOffer?.programTier ?? '',
        },
        customer_email: normalizedPayerEmail,
        success_url: `${appUrl}/join/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/join/confirm`,
        expires_at: Math.floor(Date.now() / 1000) + 2 * 60 * 60,
      })

      if (!session.url) {
        return Response.json(
          { error: 'CHECKOUT_FAILED', message: 'Could not start checkout session.' },
          { status: 500 }
        )
      }

      return Response.json({ url: session.url })
    }

    // Dev / no Stripe: activate immediately
    const tier = foundingOffer
      ? foundingOffer.lodgeTier
      : size === 'small'
        ? 'small'
        : size === 'large'
          ? 'large'
          : 'standard'
    const inviteCap = INVITE_CAPS[tier] ?? null
    const claimCode = await generateUniqueClaimCode(supabase)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)
    const amount = foundingOffer
      ? foundingOffer.priceDollars
      : STANDARD_PRICES_DOLLARS[size as keyof typeof STANDARD_PRICES_DOLLARS] ??
        STANDARD_PRICES_DOLLARS.standard

    const { error: activateError } = await supabase
      .from('lodges')
      .update({
        status:                'active',
        tier,
        original_tier:         tier,
        invite_cap:            inviteCap,
        invites_sent:          0,
        paid_at:               new Date().toISOString(),
        claim_code:            claimCode,
        claim_code_expires_at: expiresAt.toISOString(),
        slug: lodge.slug ?? (await generateUniqueLodgeSlug(supabase, lodgeName, lodgeNumber, lodge.id)),
      })
      .eq('id', lodge.id)

    if (activateError) {
      console.error('Lodge activate error:', activateError)
      return Response.json(
        { error: 'Failed to activate lodge', message: activateError.message },
        { status: 500 }
      )
    }

    try {
      await sendLodgeClaimEmail({
        to: normalizedPayerEmail,
        payerName: payerName || 'Brother',
        lodgeName,
        lodgeNumber,
        claimCode,
        tier,
        expiresAt,
      })
    } catch (emailErr) {
      console.error('Claim email failed (checkout still succeeded):', emailErr)
    }

    const params = new URLSearchParams({
      lodge: lodgeName,
      number: lodgeNumber,
      code: claimCode,
      tier,
      amount: String(amount),
      email: normalizedPayerEmail,
    })

    return Response.json({ url: `${appUrl}/join/success?${params}` })
  } catch (err) {
    console.error('create-checkout unhandled error:', err)
    const message = err instanceof Error ? err.message : 'Checkout failed'
    return Response.json({ error: 'CHECKOUT_FAILED', message }, { status: 500 })
  }
}
