import type { SupabaseClient } from '@supabase/supabase-js'

/** Count rows in request_responses — source of truth when responses_count column is stale. */
export async function countResponsesByRequestId(
  admin: SupabaseClient,
  requestIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (requestIds.length === 0) return counts

  const { data, error } = await admin
    .from('request_responses')
    .select('request_id')
    .in('request_id', requestIds)

  if (error) {
    console.error('countResponsesByRequestId:', error.message)
    return counts
  }

  for (const row of data ?? []) {
    counts.set(row.request_id, (counts.get(row.request_id) ?? 0) + 1)
  }
  return counts
}

export function withLiveResponseCounts<T extends { id: string; responses_count?: number }>(
  rows: T[],
  counts: Map<string, number>
): (T & { responses_count: number })[] {
  return rows.map((row) => ({
    ...row,
    responses_count: counts.get(row.id) ?? row.responses_count ?? 0,
  }))
}

/** Repair denormalized counts when they drift from actual responses. */
export async function syncStoredResponseCounts(
  admin: SupabaseClient,
  counts: Map<string, number>
): Promise<void> {
  await Promise.all(
    Array.from(counts.entries()).map(([requestId, count]) =>
      admin.from('requests').update({ responses_count: count }).eq('id', requestId)
    )
  )
}
