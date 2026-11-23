import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { buildSuburbsList, createSuburbsRouter } from '../src/routes/suburbs.js'

function createTestApp({ loadSuburbs, updateUserSuburb, authedUserId = 'user-123' } = {}) {
  const app = express()
  app.use(express.json())

  const fakeRequireUser = (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    req.user = { id: authedUserId }
    next()
  }

  app.use(
    '/api',
    createSuburbsRouter({
      requireUser: fakeRequireUser,
      loadSuburbs,
      updateUserSuburb,
    })
  )

  return app
}

async function request(app, path, options = {}) {
  const server = app.listen(0)
  const { port } = server.address()
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, options)
    const body = await res.json()
    return { status: res.status, body }
  } finally {
    server.close()
  }
}

describe('buildSuburbsList', () => {
  it('attaches store counts to each suburb', () => {
    const suburbs = [
      { id: 's1', name: 'Arcadia', city: 'Pretoria' },
      { id: 's2', name: 'Hatfield', city: 'Pretoria' },
    ]
    const stores = [{ suburb_id: 's2' }, { suburb_id: 's2' }]

    const result = buildSuburbsList(suburbs, stores)
    assert.deepEqual(result, [
      { id: 's1', name: 'Arcadia', city: 'Pretoria', storeCount: 0 },
      { id: 's2', name: 'Hatfield', city: 'Pretoria', storeCount: 2 },
    ])
  })
})

describe('GET /api/suburbs', () => {
  it('returns the formatted list of suburbs', async () => {
    const app = createTestApp({
      loadSuburbs: async () => [{ id: 's1', name: 'Hatfield', city: 'Pretoria', storeCount: 3 }],
    })

    const { status, body } = await request(app, '/api/suburbs')
    assert.equal(status, 200)
    assert.deepEqual(body, {
      suburbs: [{ id: 's1', name: 'Hatfield', city: 'Pretoria', storeCount: 3 }],
    })
  })

  it('returns 500 when loader throws', async () => {
    const app = createTestApp({
      loadSuburbs: async () => {
        throw new Error('DB down')
      },
    })

    const { status, body } = await request(app, '/api/suburbs')
    assert.equal(status, 500)
    assert.equal(body.error, 'Something went wrong. Try again.')
  })
})

describe('PATCH /api/me/suburb', () => {
  const validSuburbId = 'bbbbbbbb-0000-4000-8000-000000000001'

  it('returns 401 when unauthenticated', async () => {
    const app = createTestApp()
    const { status } = await request(app, '/api/me/suburb', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suburbId: validSuburbId }),
    })
    assert.equal(status, 401)
  })

  it('returns 400 for invalid suburbId format', async () => {
    const app = createTestApp()
    const { status } = await request(app, '/api/me/suburb', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ suburbId: 'not-a-uuid' }),
    })
    assert.equal(status, 400)
  })

  it('updates and returns the saved suburbId', async () => {
    const app = createTestApp({
      updateUserSuburb: async (userId, suburbId) => ({ id: userId, suburb_id: suburbId }),
    })

    const { status, body } = await request(app, '/api/me/suburb', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ suburbId: validSuburbId }),
    })

    assert.equal(status, 200)
    assert.deepEqual(body, { suburbId: validSuburbId })
  })
})
