import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyOpsToken, OPS_COOKIE } from '@/lib/ops-token'

export async function requirePlatformAdmin() {
  const token = cookies().get(OPS_COOKIE)?.value ?? ''

  if (!(await verifyOpsToken(token))) {
    return { error: Response.json({ error: 'Not found' }, { status: 404 }) }
  }

  const admin = createAdminClient()
  return { admin }
}
