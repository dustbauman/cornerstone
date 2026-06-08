// Stripe webhook: signature verification + lodge activation + upgrade path.
// Events are signed locally with STRIPE_WEBHOOK_SECRET — no Stripe round-trip.
import {
  admin, createSuite, createLodge, postStripeWebhook, tag, uniq, BASE,
} from '../lib/harness.mjs'

function checkoutCompleted(metadata, extra = {}) {
  return {
    id: 'evt_' + uniq(),
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_' + uniq(), metadata, customer_email: extra.customer_email ?? null } },
  }
}

export async function run() {
  const s = createSuite('Stripe Webhook')

  s.section('signature verification')
  {
    const res = await fetch(`${BASE}/api/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': 't=1,v1=deadbeef' },
      body: JSON.stringify({ type: 'checkout.session.completed', data: { object: {} } }),
    })
    s.eq(res.status, 400, 'forged signature rejected -> 400')
  }

  s.section('non-checkout events are ignored')
  {
    const r = await postStripeWebhook({ id: 'evt_' + uniq(), type: 'payment_intent.created', data: { object: {} } })
    s.eq(r.status, 200, 'unrelated event -> 200')
    s.ok(r.json?.received === true, 'received:true')
  }

  s.section('new lodge activation')
  {
    const lodge = await createLodge({ status: 'pending', tier: 'standard', claim_code: null, slug: null, paid_at: null })
    const event = checkoutCompleted({
      lodge_id: lodge.id,
      lodge_name: lodge.name,
      lodge_number: lodge.number,
      lodge_size: 'small',
      payer_email: `tyrian.test+payer.${uniq()}@example.com`,
      payer_name: tag('Payer'),
    })
    const r = await postStripeWebhook(event)
    s.eq(r.status, 200, 'activation webhook accepted')

    const { data: row } = await admin.from('lodges')
      .select('status, tier, invite_cap, claim_code, slug, paid_at, stripe_session_id, paid_by_email')
      .eq('id', lodge.id).single()
    s.eq(row.status, 'active', 'lodge activated')
    s.eq(row.tier, 'small', 'tier assigned from checkout metadata')
    s.ok(row.invite_cap === null, 'flat pricing has unlimited invite_cap')
    s.ok(!!row.claim_code, 'claim_code generated')
    s.ok(!!row.slug, 'slug generated')
    s.ok(!!row.paid_at, 'paid_at set')
    s.ok(!!row.stripe_session_id, 'stripe_session_id recorded')
    s.ok((row.paid_by_email || '').includes('@'), 'payer email recorded')
  }

  s.section('upgrade path')
  {
    const lodge = await createLodge({ status: 'active', tier: 'large', invite_cap: null })
    const event = checkoutCompleted({
      upgrade: 'true',
      lodge_id: lodge.id,
      to_tier: 'standard',
    })
    const r = await postStripeWebhook(event)
    s.eq(r.status, 200, 'upgrade webhook accepted')

    const { data: row } = await admin.from('lodges')
      .select('tier, invite_cap, upgraded_at, upgrade_stripe_session_id').eq('id', lodge.id).single()
    s.eq(row.tier, 'standard', 'tier upgraded')
    s.ok(row.invite_cap === null, 'invite_cap remains unlimited')
    s.ok(!!row.upgraded_at, 'upgraded_at set')
    s.ok(!!row.upgrade_stripe_session_id, 'upgrade session id recorded')
  }

  return s.summary()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { cleanupAll } = await import('../lib/harness.mjs')
  try { const r = await run(); process.exitCode = r.fail ? 1 : 0 }
  finally { await cleanupAll() }
}
