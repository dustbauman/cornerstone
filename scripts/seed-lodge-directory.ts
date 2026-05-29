import { createClient } from '@supabase/supabase-js'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// Load env manually — tsx doesn't pick up dotenv automatically
const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  const val = trimmed.slice(eqIdx + 1).trim()
  if (!process.env[key]) process.env[key] = val
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const dataDir = resolve(process.cwd(), 'data/lodges')

// FL — source: docs/florida_lodges.json (lodges.glflamason.org)
const rawFL = JSON.parse(readFileSync(resolve(dataDir, 'florida_lodges.json'), 'utf8'))
const floridaLodges = rawFL.map(
  (l: { number: number; name: string; city: string; county: string; address?: string }) => ({
    name: l.name.endsWith('Lodge') ? l.name : `${l.name} Lodge`,
    number: String(l.number),
    city: l.city || l.county,
    state: 'FL',
    grand_lodge: 'Grand Lodge of Florida',
    source: 'lodges.glflamason.org — May 2026',
    meeting_address: l.address ?? null,
  })
)

// OK — existing format: { name, number, city, state, grand_lodge, source }
const oklahomaLodges = JSON.parse(readFileSync(resolve(dataDir, 'oklahoma_lodges.json'), 'utf8'))

async function main() {
  console.log('\n🗺  Seeding lodge directory...\n')

  // Upsert in place — do NOT delete FL rows first. Active lodges may reference
  // lodge_directory rows via directory_id (lodges_directory_id_fkey).
  const allLodges = [...floridaLodges, ...oklahomaLodges]
  const batchSize = 50
  let total = 0
  let errors = 0

  for (let i = 0; i < allLodges.length; i += batchSize) {
    const batch = allLodges.slice(i, i + batchSize)
    const { data, error } = await supabase
      .from('lodge_directory')
      .upsert(batch, { onConflict: 'number,state' })
      .select('id')

    if (error) {
      console.error(`   ✗ Batch ${Math.floor(i / batchSize) + 1} error:`, error.message)
      errors += batch.length
    } else {
      total += data?.length ?? 0
    }
  }

  const byState: Record<string, number> = {}
  for (const l of allLodges) byState[l.state] = (byState[l.state] || 0) + 1

  console.log(`\n✅ Lodge directory seeded:`)
  for (const [state, count] of Object.entries(byState).sort()) {
    console.log(`   ${state}: ${count} lodges`)
  }
  if (errors > 0) console.log(`   ✗ ${errors} errors`)
  console.log(`   Total: ${total} upserted\n`)
}

main().catch(err => {
  console.error('\n💥 Seed failed:', err)
  process.exit(1)
})
