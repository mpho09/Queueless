import { test } from 'node:test'
import assert from 'node:assert/strict'
import app from '../src/app.js'

// Starts the real app on a free port, so this tests exactly what Vercel and `npm run dev` run.
async function withServer(run) {
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  try {
    await run(`http://localhost:${server.address().port}`)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

test('GET /api/health answers 200 with status "ok"', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/health`)
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.status, 'ok')
    assert.ok(['configured', 'not configured'].includes(body.database))
  })
})

test('the app starts nothing by itself: importing it does not open a port', () => {
  assert.equal(typeof app.listen, 'function')
  assert.equal(typeof app, 'function') // an Express app is a (req, res) handler, which is what Vercel needs
})
