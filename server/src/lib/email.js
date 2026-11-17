// Sends email through Resend (plan §10.1) using Node's built-in fetch, so no extra package is needed.
// Without RESEND_API_KEY (development and tests) it logs the email instead of sending it.

const RESEND_URL = 'https://api.resend.com/emails'

/**
 * @param {{ to: string, subject: string, text: string, html?: string, ref?: string }} message
 *   `ref` (e.g. "basket <id>") is only used in logs and is not sent.
 * @param {{ apiKey?: string, from?: string, fetch?: typeof fetch, log?: (line: string) => void }} [options]
 *   Defaults come from RESEND_API_KEY and EMAIL_FROM; tests pass their own.
 * @returns {Promise<string|null>} Resend's email id, or null when it only logged.
 */
export async function sendEmail(message, options = {}) {
  const {
    apiKey = process.env.RESEND_API_KEY,
    from = process.env.EMAIL_FROM,
    fetch: doFetch = globalThis.fetch,
    log = console.log,
  } = options

  if (!apiKey) {
    // Never log the recipient's address (POPIA): logs on the host are stored.
    log(`[email] RESEND_API_KEY not set, not sending (${message.ref ?? 'no ref'}): ${message.subject}`)
    return null
  }
  if (!from) {
    throw new Error('EMAIL_FROM is not set, so Resend would reject every email. Add it to server/.env')
  }

  const res = await doFetch(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`Resend ${res.status}: ${data?.message ?? 'request failed'}`)
  return data?.id ?? null
}
