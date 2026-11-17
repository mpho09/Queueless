import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sendEmail } from '../src/lib/email.js'

const message = { to: 'joy@example.com', subject: 'Hello', text: 'Hi', html: '<p>Hi</p>', ref: 'basket b1' }

test('sends through the Resend API with the key and sender', async () => {
  const calls = []
  const fakeFetch = async (url, options) => {
    calls.push({ url, options })
    return { ok: true, json: async () => ({ id: 'email-123' }) }
  }

  const id = await sendEmail(message, { apiKey: 're_test', from: 'Queueless <alerts@q.example>', fetch: fakeFetch })

  assert.equal(id, 'email-123')
  assert.equal(calls[0].url, 'https://api.resend.com/emails')
  assert.equal(calls[0].options.method, 'POST')
  assert.equal(calls[0].options.headers.Authorization, 'Bearer re_test')
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    from: 'Queueless <alerts@q.example>',
    to: ['joy@example.com'],
    subject: 'Hello',
    text: 'Hi',
    html: '<p>Hi</p>',
  })
})

test('with no API key (development), it logs instead of sending', async () => {
  let called = false
  const logs = []
  const id = await sendEmail(message, {
    apiKey: '',
    fetch: async () => {
      called = true
    },
    log: (line) => logs.push(line),
  })

  assert.equal(id, null)
  assert.equal(called, false)
  // POPIA: logs name the basket, never the recipient's email address
  assert.match(logs[0], /basket b1/)
  assert.doesNotMatch(logs[0], /joy@example\.com/)
})

test('a Resend error is thrown with its message', async () => {
  const fakeFetch = async () => ({ ok: false, status: 422, json: async () => ({ message: 'Invalid from address' }) })
  await assert.rejects(
    sendEmail(message, { apiKey: 're_test', from: 'x', fetch: fakeFetch }),
    /Resend 422: Invalid from address/,
  )
})

test('with an API key but no sender address, it fails early with a clear message', async () => {
  let called = false
  await assert.rejects(
    sendEmail(message, { apiKey: 're_test', from: '', fetch: async () => { called = true } }),
    /EMAIL_FROM is not set/,
  )
  assert.equal(called, false)
})
