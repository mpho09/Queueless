import { test } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { buildSavingsSummary, createSavingsRouter, loadSavingsData } from '../src/routes/savings.js'

const NOW = new Date('2026-11-16T08:00:00+02:00') // Monday morning, SAST

const profile = { display_name: 'Joy Mokoena', email: 'tester.joy@queueless.co.za', reward_points: 120 }

// ── buildSavingsSummary: rows → the shape S6 reads (see client/src/screens/refilwe/sampleSavings.js)

test('sums this month, and gives the last 4 months oldest first, with R0 for empty months', () => {
  const summary = buildSavingsSummary({
    now: NOW,
    profile,
    reportsThisMonth: 8,
    reports: [],
    events: [
      { amount_cents: 400, saved_on: '2026-11-02' },
      { amount_cents: 1250, saved_on: '2026-11-15' },
      { amount_cents: 900, saved_on: '2026-09-20' },
      { amount_cents: 300, saved_on: '2026-07-31' }, // older than 4 months: ignored
    ],
  })

  assert.equal(summary.monthTotalCents, 1650)
  assert.deepEqual(summary.last4Months, [
    { month: '2026-08', cents: 0 },
    { month: '2026-09', cents: 900 },
    { month: '2026-10', cents: 0 },
    { month: '2026-11', cents: 1650 },
  ])
  assert.deepEqual(summary.profile, { displayName: 'Joy Mokoena', email: 'tester.joy@queueless.co.za' })
  assert.equal(summary.points, 120)
  assert.equal(summary.reportsThisMonth, 8)
})

test('months cross the new year correctly', () => {
  const summary = buildSavingsSummary({ now: new Date('2027-01-10T12:00:00+02:00'), profile, events: [], reports: [], reportsThisMonth: 0 })
  assert.deepEqual(summary.last4Months.map((m) => m.month), ['2026-10', '2026-11', '2026-12', '2027-01'])
})

test('"this month" is South African time: 01:30 on 1 December SAST is December', () => {
  const summary = buildSavingsSummary({
    now: new Date('2026-11-30T23:30:00Z'), // = 1 Dec 01:30 SAST
    profile,
    events: [{ amount_cents: 500, saved_on: '2026-12-01' }],
    reports: [],
    reportsThisMonth: 0,
  })
  assert.equal(summary.last4Months.at(-1).month, '2026-12')
  assert.equal(summary.monthTotalCents, 500)
})

test('recent activity: titles per report type, +10 points only when verified (D4)', () => {
  const summary = buildSavingsSummary({
    now: NOW,
    profile,
    events: [],
    reportsThisMonth: 3,
    reports: [
      { id: 'r1', report_type: 'Queue', is_verified: true, created_at: '2026-11-11T12:05:00Z', stores: { name: 'Shoprite Hatfield' } },
      { id: 'r2', report_type: 'Price', is_verified: false, created_at: '2026-11-10T08:22:00Z', stores: { name: 'Pick n Pay Hatfield' } },
      { id: 'r3', report_type: 'Stock', is_verified: true, created_at: '2026-11-09T08:00:00Z', stores: null },
    ],
  })
  assert.deepEqual(summary.recent, [
    { id: 'r1', title: 'Queue report verified', storeName: 'Shoprite Hatfield', at: '2026-11-11T12:05:00Z', points: 10 },
    { id: 'r2', title: 'Price update', storeName: 'Pick n Pay Hatfield', at: '2026-11-10T08:22:00Z', points: 0 },
    { id: 'r3', title: 'Stock update verified', storeName: '', at: '2026-11-09T08:00:00Z', points: 10 },
  ])
})

test('a new user gets zeros everywhere (S6 shows "Start comparing prices…")', () => {
  const summary = buildSavingsSummary({
    now: NOW,
    profile: { display_name: null, email: 'new.user@example.com', reward_points: 0 },
    events: [],
    reports: [],
    reportsThisMonth: 0,
  })
  assert.equal(summary.monthTotalCents, 0)
  assert.ok(summary.last4Months.every((m) => m.cents === 0))
  assert.deepEqual(summary.recent, [])
  assert.equal(summary.profile.displayName, 'new.user') // no display name yet: use the email name
})

// ── loadSavingsData: every query is limited to the logged-in user

function fakeDb(answers) {
  const queries = []
  return {
    queries,
    from(table) {
      const q = { table, filters: [] }
      queries.push(q)
      const chain = {
        select: (cols, opts) => ((q.select = cols), (q.selectOpts = opts), chain),
        eq: (col, val) => (q.filters.push(['eq', col, val]), chain),
        gte: (col, val) => (q.filters.push(['gte', col, val]), chain),
        order: (col, opts) => ((q.order = [col, opts]), chain),
        limit: (n) => ((q.limit = n), chain),
        maybeSingle: () => ((q.single = true), chain),
        then: (resolve, reject) => Promise.resolve(answers(q)).then(resolve, reject),
      }
      return chain
    },
  }
}

test('loads only the user\'s own rows, from 4 months back and this SAST month', async () => {
  const db = fakeDb((q) => {
    if (q.table === 'profiles') return { data: profile, error: null }
    if (q.table === 'savings_events') return { data: [{ amount_cents: 400, saved_on: '2026-11-02' }], error: null }
    if (q.selectOpts?.head) return { count: 8, error: null }
    return { data: [], error: null }
  })

  const summary = await loadSavingsData(db, 'user-1', NOW)

  assert.equal(summary.monthTotalCents, 400)
  assert.equal(summary.reportsThisMonth, 8)
  for (const q of db.queries) {
    const idFilter = q.table === 'profiles' ? ['eq', 'id', 'user-1'] : ['eq', 'user_id', 'user-1']
    assert.deepEqual(q.filters[0], idFilter, `${q.table} must be filtered to the user`)
  }
  const events = db.queries.find((q) => q.table === 'savings_events')
  assert.deepEqual(events.filters[1], ['gte', 'saved_on', '2026-08-01'])
  const count = db.queries.find((q) => q.selectOpts?.head)
  assert.deepEqual(count.filters[1], ['gte', 'created_at', '2026-11-01T00:00:00+02:00'])
  const recent = db.queries.find((q) => q.table === 'report_logs' && !q.selectOpts?.head)
  assert.equal(recent.limit, 5)
})

test('a database error is thrown, not hidden', async () => {
  const db = fakeDb((q) => (q.table === 'savings_events' ? { data: null, error: { message: 'boom' } } : { data: profile, error: null }))
  await assert.rejects(loadSavingsData(db, 'user-1', NOW), /boom/)
})

// ── GET /api/me/savings, with requireUser passed in

async function call(router) {
  const app = express()
  app.use('/api', router)
  const server = app.listen(0)
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/me/savings`)
    return { status: res.status, body: await res.json() }
  } finally {
    server.close()
  }
}

const letIn = (req, _res, next) => ((req.user = { id: 'user-1' }), next())
const keepOut = (_req, res) => res.status(401).json({ error: 'Session expired. Please log in again to save your changes.' })

test('without a logged-in user it returns 401 and never touches the database', async () => {
  let loaded = false
  const res = await call(createSavingsRouter({ requireUser: keepOut, loadSummary: async () => ((loaded = true), {}) }))
  assert.equal(res.status, 401)
  assert.equal(loaded, false)
})

test('returns the logged-in user\'s summary', async () => {
  let askedFor
  const res = await call(
    createSavingsRouter({ requireUser: letIn, loadSummary: async (userId) => ((askedFor = userId), { monthTotalCents: 400 }) }),
  )
  assert.equal(res.status, 200)
  assert.equal(askedFor, 'user-1')
  assert.deepEqual(res.body, { monthTotalCents: 400 })
})

test('a failure returns the standard message without leaking details', async () => {
  const res = await call(
    createSavingsRouter({
      requireUser: letIn,
      loadSummary: async () => {
        throw new Error('relation "secret_table" does not exist')
      },
    }),
  )
  assert.equal(res.status, 500)
  assert.deepEqual(res.body, { error: 'Something went wrong. Try again.' })
})
