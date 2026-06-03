// Loads .env.local into process.env for integration tests, then hard-disables
// real email sending. Unit tests ignore this; integration tests need the
// Supabase service-role key and must NEVER hit Resend.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

try {
  const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const key = m[1]
    let val = m[2].trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
} catch {
  // .env.local absent — pure unit tests still run; integration tests will skip.
}

// Never send real email from tests, regardless of what .env.local holds.
process.env.RESEND_API_KEY = ''
