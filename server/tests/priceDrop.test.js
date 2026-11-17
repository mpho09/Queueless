import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkPriceDrop, formatZARCents, priceDropEmail, runPriceDropCheck } from '../src/jobs/priceDrop.js'

test('a drop of more than 10% counts', () => {
  assert.deepEqual(checkPriceDrop(10000, 8900), { dropped: true, diffCents: 1100 })
})

test('exactly 10% is not "more than 10%"', () => {
  assert.equal(checkPriceDrop(10000, 9000).dropped, false)
})

test('small drops and price rises do not count', () => {
  assert.equal(checkPriceDrop(10000, 9500).dropped, false)
  assert.equal(checkPriceDrop(10000, 12000).dropped, false)
})

test('no previous total (first check) or no current total never counts', () => {
  assert.equal(checkPriceDrop(null, 5000).dropped, false)
  assert.equal(checkPriceDrop(10000, null).dropped, false)
  assert.equal(checkPriceDrop(0, 0).dropped, false)
})

test('formats cents as rand, like the app', () => {
  assert.equal(formatZARCents(1100), 'R11.00')
  assert.equal(formatZARCents(123450), 'R1,234.50')
  assert.equal(formatZARCents(5), 'R0.05')
})

test('the email uses the exact text from the plan (§10.1) and links to the basket', () => {
  const email = priceDropEmail({ diffCents: 1250, storeName: 'Shoprite Hatfield', appUrl: 'https://queueless.example' })
  assert.equal(email.subject, 'Price drop alert: Your active grocery basket is now R12.50 cheaper at Shoprite Hatfield!')
  assert.match(email.text, /https:\/\/queueless\.example\/basket/)
  assert.match(email.html, /href="https:\/\/queueless\.example\/basket"/)
})

test('the email escapes store names so they cannot inject HTML', () => {
  const email = priceDropEmail({ diffCents: 100, storeName: '<b>Shop</b>', appUrl: 'https://q.example' })
  assert.doesNotMatch(email.html, /<b>Shop<\/b>/)
  assert.match(email.html, /&lt;b&gt;Shop&lt;\/b&gt;/)
})

function fakeDeps(baskets, { failEmailFor = [] } = {}) {
  const saved = []
  const sent = []
  return {
    saved,
    sent,
    deps: {
      appUrl: 'https://q.example',
      getActiveBaskets: async () => baskets,
      saveLastTotal: async (basketId, cents) => saved.push([basketId, cents]),
      sendEmail: async (email) => {
        if (failEmailFor.includes(email.to)) throw new Error('Resend is down')
        sent.push(email)
      },
    },
  }
}

const shoprite = { storeName: 'Shoprite Hatfield' }

test('the job emails only baskets that dropped by more than 10%; small drops keep the old total', async () => {
  const { deps, saved, sent } = fakeDeps([
    { basketId: 'b1', email: 'joy@example.com', lastTotalCents: 10000, cheapest: { ...shoprite, totalCents: 8000 } },
    { basketId: 'b2', email: 'sam@example.com', lastTotalCents: 10000, cheapest: { ...shoprite, totalCents: 9800 } },
    { basketId: 'b3', email: 'lee@example.com', lastTotalCents: null, cheapest: { ...shoprite, totalCents: 5000 } },
  ])

  const result = await runPriceDropCheck(deps)

  assert.deepEqual(result, { checked: 3, emailed: 1, failed: 0 })
  assert.equal(sent.length, 1)
  assert.equal(sent[0].to, 'joy@example.com')
  assert.match(sent[0].subject, /now R20\.00 cheaper at Shoprite Hatfield/)
  assert.equal(sent[0].ref, 'basket b1') // basket id for logs, never the email address
  // b1 was emailed, b3 had no total yet; b2's small drop keeps comparing against R100.00
  assert.deepEqual(saved, [['b1', 8000], ['b3', 5000]])
})

test('a basket with no complete store is skipped and keeps its last total', async () => {
  const { deps, saved, sent } = fakeDeps([
    { basketId: 'b1', email: 'joy@example.com', lastTotalCents: 10000, cheapest: null },
  ])
  assert.deepEqual(await runPriceDropCheck(deps), { checked: 1, emailed: 0, failed: 0 })
  assert.equal(sent.length, 0)
  assert.equal(saved.length, 0)
})

test('if an email fails, the total is not saved, so the next run tries again; other baskets still go out', async () => {
  const { deps, saved, sent } = fakeDeps(
    [
      { basketId: 'b1', email: 'down@example.com', lastTotalCents: 10000, cheapest: { ...shoprite, totalCents: 8000 } },
      { basketId: 'b2', email: 'joy@example.com', lastTotalCents: 10000, cheapest: { ...shoprite, totalCents: 8000 } },
    ],
    { failEmailFor: ['down@example.com'] },
  )

  assert.deepEqual(await runPriceDropCheck(deps), { checked: 2, emailed: 1, failed: 1 })
  assert.deepEqual(sent.map((e) => e.to), ['joy@example.com'])
  assert.deepEqual(saved, [['b2', 8000]])
})

test('a gradual drop still triggers an email (R100 falling 5% a day, from #30 review)', async () => {
  let lastTotalCents = 10000
  const emailsByDay = []
  for (let day = 1; day <= 5; day++) {
    const totalCents = Math.round(10000 * 0.95 ** day) // R95.00, R90.25, R85.74, R81.45, R77.38
    const sent = []
    await runPriceDropCheck({
      appUrl: 'https://q.example',
      getActiveBaskets: async () => [
        { basketId: 'b1', email: 'joy@example.com', lastTotalCents, cheapest: { ...shoprite, totalCents } },
      ],
      saveLastTotal: async (_id, cents) => {
        lastTotalCents = cents
      },
      sendEmail: async (email) => sent.push(email),
    })
    emailsByDay.push(sent.length)
  }
  // Day 3 is 14.26% below the R100.00 the shopper started with
  assert.deepEqual(emailsByDay, [0, 0, 1, 0, 0])
  assert.equal(lastTotalCents, 8574) // "cheaper than when we last told you"
})

test('a price rise is saved, so later drops are measured from the higher price', async () => {
  const { deps, saved, sent } = fakeDeps([
    { basketId: 'b1', email: 'joy@example.com', lastTotalCents: 10000, cheapest: { ...shoprite, totalCents: 12000 } },
  ])
  assert.deepEqual(await runPriceDropCheck(deps), { checked: 1, emailed: 0, failed: 0 })
  assert.equal(sent.length, 0)
  assert.deepEqual(saved, [['b1', 12000]])
})
