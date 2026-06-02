import { createAdminClient } from '@/lib/supabase/admin'
import { sponsorResponsePage } from '@/lib/email'

function htmlResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')?.trim()

  if (!token) {
    return htmlResponse(
      sponsorResponsePage('Invalid link', 'This unsubscribe link is missing its token.'),
      400
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .update({ request_emails_enabled: false })
    .eq('request_emails_unsubscribe_token', token)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    return htmlResponse(
      sponsorResponsePage(
        'Link not recognized',
        'This unsubscribe link is invalid or has already been used. You can manage request emails from your dashboard.'
      ),
      404
    )
  }

  return htmlResponse(
    sponsorResponsePage(
      'Unsubscribed',
      "You won't receive new-request emails anymore. You can turn them back on anytime from your dashboard."
    )
  )
}
