import { test } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createJobsRouter, hasCronSecret } from '../src/routes/jobs.js'
import { getActiveBaskets, saveLastTotal } from '../src/jobs/priceDropData.js'

// ── GET /api/jobs/price-drop: only Vercel Cron, with the secret, may run it

async function call(router, headers = {}) {
  const app = express()
  app.use('/api', router)
  const server = app.listen(0)
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/jobs/price-drop`, { headers })
    return { status: res.status, body: await res.json() }
  } finally {
    server.close()
  }
}

const SECRET = 'test-cron-secret-1234567890'
const quiet = async (fn) => {
  const original = console.error
  console.error = () => {}
  try {
    return await fn()
  } finally {
    console.error = original
  }
}

test('without the secret it answers 401 and does not run the job', async () => {
  let ran = false
  const router = createJobsRouter({ getSecret: () => SECRET, runCheck: async () => ((ran = true), {}) })

  assert.equal((await call(router)).status, 401)
  assert.equal((await call(router, { Authorization: 'Bearer wrong-secret' })).status, 401)
  assert.equal((await call(router, { Authorization: SECRET })).status, 401, 'needs the Bearer prefix')
  assert.equal(ran, false)
})

test('if CRON_SECRET is not set, it refuses to run at all (never open to everyone)', async () => {
  let ran = false
  const res = await quiet(() =>
    call(createJobsRouter({ getSecret: () => undefined, runCheck: async () => ((ran = true), {}) }), {
      Authorization: 'Bearer ',
    }),
  )
  assert.equal(res.status, 503)
  assert.equal(ran, false)
})

test('with the secret it runs the check and answers with the counts', async () => {
  const counts = { checked: 3, emailed: 1, failed: 0 }
  const original = console.log
  console.log = () => {}
  try {
    const res = await call(createJobsRouter({ getSecret: () => SECRET, runCheck: async () => counts }), {
      Authorization: `Bearer ${SECRET}`,
    })
    assert.equal(res.status, 200)
    assert.deepEqual(res.body, counts)
  } finally {
    console.log = original
  }
})

test('a failure returns the standard message without leaking details', async () => {
  const res = await quiet(() =>
    call(
      createJobsRouter({
        getSecret: () => SECRET,
        runCheck: async () => {
          throw new Error('relation "secret_table" does not exist')
        },
      }),
      { Authorization: `Bearer ${SECRET}` },
    ),
  )
  assert.equal(res.status, 500)
  assert.deepEqual(res.body, { error: 'Something went wrong. Try again.' })
})

test('hasCronSecret: exact match only', () => {
  assert.equal(hasCronSecret(`Bearer ${SECRET}`, SECRET), true)
  assert.equal(hasCronSecret(`Bearer ${SECRET}x`, SECRET), false)
  assert.equal(hasCronSecret(undefined, SECRET), false)
  assert.equal(hasCronSecret('Bearer ', ''), false)
})

test('the real app has the route, and it is closed without the secret', async () => {
  const { default: app } = await import('../src/app.js')
  const server = app.listen(0)
  try {
    const res = await quiet(() => fetch(`http://127.0.0.1:${server.address().port}/api/jobs/price-drop`))
    assert.ok([401, 503].includes(res.status), `got ${res.status}`)
  } finally {
    server.close()
  }
})

// ── The database pieces given to runPriceDropCheck

test('getActiveBaskets maps the rows to what runPriceDropCheck expects', async () => {
  let called
  const db = {
    rpc: async (name) => {
      called = name
      return {
        data: [
          { basket_id: 'b1', email: 'a@example.com', last_total_cents: 12000, store_name: 'Shoprite Hatfield', total_cents: 9897 },
          { basket_id: 'b2', email: 'b@example.com', last_total_cents: null, store_name: null, total_cents: null },
        ],
        error: null,
      }
    },
  }
  assert.deepEqual(await getActiveBaskets(db), [
    { basketId: 'b1', email: 'a@example.com', lastTotalCents: 12000, cheapest: { storeName: 'Shoprite Hatfield', totalCents: 9897 } },
    { basketId: 'b2', email: 'b@example.com', lastTotalCents: null, cheapest: null },
  ])
  assert.equal(called, 'price_drop_candidates')
})

test('saveLastTotal upserts the total for that basket', async () => {
  let table
  let row
  const db = { from: (t) => ((table = t), { upsert: async (r) => ((row = r), { error: null }) }) }
  await saveLastTotal(db, 'b1', 9897, new Date('2026-11-20T06:00:00Z'))
  assert.equal(table, 'basket_price_watch')
  assert.deepEqual(row, { basket_id: 'b1', last_total_cents: 9897, updated_at: '2026-11-20T06:00:00.000Z' })
})

test('database errors are thrown, not hidden', async () => {
  await assert.rejects(getActiveBaskets({ rpc: async () => ({ data: null, error: { message: 'boom' } }) }), /boom/)
  const db = { from: () => ({ upsert: async () => ({ error: { message: 'nope' } }) }) }
  await assert.rejects(saveLastTotal(db, 'b1', 100), /nope/)
})
