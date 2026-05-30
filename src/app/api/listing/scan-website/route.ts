import { createClient } from '@/lib/supabase/server'
import {
  fetchWebsiteText,
  isSafeWebsiteUrl,
  scanWebsiteWithAi,
} from '@/lib/listing/scan-website'
import { normalizeWebsiteUrl } from '@/lib/url'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { url?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const rawUrl = body.url?.trim()
  if (!rawUrl) {
    return Response.json({ error: 'Website URL is required.' }, { status: 400 })
  }

  const websiteUrl = normalizeWebsiteUrl(rawUrl)
  if (!websiteUrl || !isSafeWebsiteUrl(websiteUrl)) {
    return Response.json({ error: 'Enter a valid public website URL.' }, { status: 400 })
  }

  try {
    const pageText = await fetchWebsiteText(websiteUrl)
    if (pageText.length < 80) {
      return Response.json(
        { error: 'Could not read enough content from that page. Try another URL or enter details manually.' },
        { status: 422 }
      )
    }

    const result = await scanWebsiteWithAi(websiteUrl, pageText)
    return Response.json({ result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Website scan failed.'
    return Response.json({ error: message }, { status: 502 })
  }
}
