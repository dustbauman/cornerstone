// One-command test runner for the Tyrian platform.
//
//   node --env-file=.env.local scripts/test/run-all.mjs
//   (or: pnpm test)
//
// What it does:
//   1. Ensures a dev server on TEST_PORT (default 3100). If one is already up it
//      is reused; otherwise we spawn `next dev` with email sending DISABLED
//      (RESEND_API_KEY='') and dummy Stripe creds so webhook signing works.
//   2. Runs every .mjs integration suite against it and aggregates pass/fail.
//   3. Runs the Vitest unit + match-pros integration tests.
//   4. Tears down anything it started and exits non-zero if anything failed.
//
// No real emails are ever sent; assertions check DB state + HTTP responses.
import { spawn } from 'node:child_process'

const PORT = process.env.TEST_PORT || '3100'
const BASE = `http://localhost:${PORT}`
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_tyrian_test_secret'

// Make these visible to the suites (they import the harness, which reads these).
process.env.TEST_BASE_URL = BASE
process.env.STRIPE_WEBHOOK_SECRET = STRIPE_WEBHOOK_SECRET

const SUITES = [
  'smoke', 'signup', 'requests', 'admin-roles', 'stripe', 'security', 'ops',
]

async function isUp() {
  try {
    const res = await fetch(BASE, { redirect: 'manual' })
    return res.status > 0
  } catch {
    return false
  }
}

async function waitForServer(timeoutMs = 90_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await isUp()) return true
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

function startServer() {
  console.log(`\n▶ Starting test server on :${PORT} (RESEND disabled, dummy Stripe creds)…`)
  const child = spawn('pnpm', ['exec', 'next', 'dev', '-p', PORT], {
    env: {
      ...process.env,
      // Empty string counts as "set" — Next will not override it from .env.local.
      RESEND_API_KEY: '',
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_tyrian_dummy',
      STRIPE_WEBHOOK_SECRET,
    },
    stdio: 'ignore',
    detached: false,
  })
  child.on('error', (e) => console.error('server spawn error:', e.message))
  return child
}

async function main() {
  let server = null
  let startedHere = false

  if (await isUp()) {
    console.log(`▶ Reusing server already running on :${PORT}`)
  } else {
    server = startServer()
    startedHere = true
    const ok = await waitForServer()
    if (!ok) {
      console.error('✗ Test server never became ready.')
      if (server) server.kill('SIGTERM')
      process.exit(1)
    }
    console.log('✓ Server ready.')
  }

  let totalPass = 0
  let totalFail = 0
  const allFailures = []

  try {
    for (const name of SUITES) {
      const { run } = await import(`./suites/${name}.suite.mjs`)
      const { pass, fail, failures } = await run()
      totalPass += pass
      totalFail += fail
      for (const f of failures) allFailures.push(`[${name}] ${f}`)
    }
  } finally {
    const { cleanupAll } = await import('./lib/harness.mjs')
    await cleanupAll()
    if (startedHere && server) server.kill('SIGTERM')
  }

  // Vitest (unit + match-pros integration). Runs in its own process.
  console.log(`\n${'='.repeat(60)}\n  Vitest (unit + match-pros integration)\n${'='.repeat(60)}`)
  const vitestCode = await new Promise((resolve) => {
    const v = spawn('pnpm', ['exec', 'vitest', 'run'], { stdio: 'inherit', env: process.env })
    v.on('close', (code) => resolve(code ?? 1))
  })

  console.log(`\n${'#'.repeat(60)}`)
  console.log(`  INTEGRATION SUITES: ${totalPass} passed, ${totalFail} failed`)
  console.log(`  VITEST: ${vitestCode === 0 ? 'passed' : 'FAILED'}`)
  if (allFailures.length) {
    console.log('\n  Integration failures:')
    for (const f of allFailures) console.log(`    ✗ ${f}`)
  }
  console.log(`${'#'.repeat(60)}\n`)

  process.exit(totalFail > 0 || vitestCode !== 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('Runner crashed:', e)
  process.exit(1)
})
