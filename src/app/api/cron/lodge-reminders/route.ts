import { createClient } from '@supabase/supabase-js'
import { sendClaimReminder } from '@/lib/email'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = adminClient()
  const now = new Date()

  const day7Threshold = new Date(now)
  day7Threshold.setDate(day7Threshold.getDate() - 7)

  const { data: day7Lodges } = await supabase
    .from('lodges')
    .select('*')
    .eq('status', 'active')
    .is('claim_code_claimed_at', null)
    .is('reminder_7_sent_at', null)
    .lt('paid_at', day7Threshold.toISOString())
    .gt('claim_code_expires_at', now.toISOString())

  let day7Sent = 0
  for (const lodge of day7Lodges || []) {
    await sendClaimReminder({
      to: lodge.paid_by_email,
      payerName: lodge.paid_by_name || 'Brother',
      lodgeName: lodge.name,
      lodgeNumber: lodge.number,
      claimCode: lodge.claim_code,
      expiresAt: new Date(lodge.claim_code_expires_at),
      daysUntilExpiry: 23,
    })
    await supabase.from('lodges').update({ reminder_7_sent_at: now.toISOString() }).eq('id', lodge.id)
    day7Sent++
  }

  const day25Threshold = new Date(now)
  day25Threshold.setDate(day25Threshold.getDate() - 25)

  const { data: day25Lodges } = await supabase
    .from('lodges')
    .select('*')
    .eq('status', 'active')
    .is('claim_code_claimed_at', null)
    .is('reminder_25_sent_at', null)
    .lt('paid_at', day25Threshold.toISOString())
    .gt('claim_code_expires_at', now.toISOString())

  let day25Sent = 0
  for (const lodge of day25Lodges || []) {
    await sendClaimReminder({
      to: lodge.paid_by_email,
      payerName: lodge.paid_by_name || 'Brother',
      lodgeName: lodge.name,
      lodgeNumber: lodge.number,
      claimCode: lodge.claim_code,
      expiresAt: new Date(lodge.claim_code_expires_at),
      daysUntilExpiry: 5,
    })
    await supabase.from('lodges').update({ reminder_25_sent_at: now.toISOString() }).eq('id', lodge.id)
    day25Sent++
  }

  return Response.json({ day7Sent, day25Sent })
}
