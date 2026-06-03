// Smoke: public pages render (200) and protected pages redirect when logged out.
// Catches build/route regressions before deeper suites run.
import { apiFetch, createSuite } from '../lib/harness.mjs'

const PUBLIC_PAGES = [
  '/', '/directory', '/requests', '/login', '/join',
  '/about', '/privacy', '/terms', '/contact',
]

export async function run() {
  const s = createSuite('Smoke: public pages')

  s.section('public pages return 200')
  for (const path of PUBLIC_PAGES) {
    const r = await apiFetch(path)
    s.eq(r.status, 200, `GET ${path} -> 200`)
  }

  s.section('public API health')
  {
    const r = await apiFetch('/api/requests')
    s.eq(r.status, 200, 'GET /api/requests -> 200')
    s.ok(Array.isArray(r.json?.requests), 'requests payload is an array')
  }

  s.section('protected pages redirect when logged out')
  for (const path of ['/dashboard', '/settings']) {
    const r = await apiFetch(path)
    s.ok(r.status === 307 || r.status === 302, `GET ${path} redirects when unauthenticated (got ${r.status})`)
  }

  return s.summary()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { cleanupAll } = await import('../lib/harness.mjs')
  try { const r = await run(); process.exitCode = r.fail ? 1 : 0 }
  finally { await cleanupAll() }
}
