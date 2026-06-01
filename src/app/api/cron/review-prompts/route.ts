import { createClient } from '@supabase/supabase-js'
import { sendReviewPromptEmail } from '@/lib/email'
import {
  getFilledRequestReviewContext,
  getRequesterEmail,
} from '@/lib/reviews/resolve-provider'

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
  const now = new Date().toISOString()

  const { data: dueRequests, error } = await supabase
    .from('requests')
    .select('id')
    .eq('status', 'filled')
    .not('review_prompt_at', 'is', null)
    .lte('review_prompt_at', now)
    .is('review_prompt_sent_at', null)

  if (error) {
    console.error('review-prompts cron query:', error.message)
    return Response.json({ error: 'Query failed' }, { status: 500 })
  }

  let sent = 0
  let skipped = 0

  for (const row of dueRequests ?? []) {
    const ctx = await getFilledRequestReviewContext(supabase, row.id)
    if (!ctx) {
      skipped++
      continue
    }

    if (ctx.requesterProfileId) {
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('listing_id', ctx.listingId)
        .eq('reviewer_id', ctx.requesterProfileId)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('requests')
          .update({ review_prompt_sent_at: now })
          .eq('id', row.id)
        skipped++
        continue
      }
    }

    const to = await getRequesterEmail(supabase, ctx)
    if (!to) {
      skipped++
      continue
    }

    try {
      await sendReviewPromptEmail({
        to,
        requesterName: ctx.requesterName,
        requestTitle: ctx.requestTitle,
        businessName: ctx.businessName,
        ownerName: ctx.ownerName,
        listingId: ctx.listingId,
        requestId: ctx.requestId,
      })

      await supabase
        .from('requests')
        .update({ review_prompt_sent_at: now })
        .eq('id', row.id)

      sent++
    } catch (err) {
      console.error(`review prompt failed for request ${row.id}:`, err)
      skipped++
    }
  }

  return Response.json({
    due: dueRequests?.length ?? 0,
    sent,
    skipped,
  })
}
