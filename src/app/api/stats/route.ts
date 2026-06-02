import { getLandingStats } from '@/lib/db/stats'

export const dynamic = 'force-dynamic'

export async function GET() {
  const stats = await getLandingStats()
  return Response.json(stats)
}
