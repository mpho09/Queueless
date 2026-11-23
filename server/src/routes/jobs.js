// GET /api/jobs/price-drop (#20): runs the price-drop email check (jobs/priceDrop.js).
// Vercel Cron calls it once a day (vercel.json → "crons") with `Authorization: Bearer <CRON_SECRET>`.
// Anyone else gets 401, and if CRON_SECRET isn't set the route refuses to run at all.
import { timingSafeEqual } from 'node:crypto'
import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { sendEmail } from '../lib/email.js'
import { runPriceDropCheck } from '../jobs/priceDrop.js'
import { getActiveBaskets, saveLastTotal } from '../jobs/priceDropData.js'

const SERVER_ERROR = 'Something went wrong. Try again.' // client/src/lib/messages.js serverError
const DEFAULT_APP_URL = 'https://queueless-copilot.vercel.app'

/** Constant-time check of the Authorization header against the secret. */
export function hasCronSecret(header, secret) {
  if (!secret || typeof header !== 'string') return false
  const given = Buffer.from(header)
  const expected = Buffer.from(`Bearer ${secret}`)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

async function runWithSupabase() {
  if (!supabase) throw new Error('Supabase is not configured on the server')
  return runPriceDropCheck({
    getActiveBaskets: () => getActiveBaskets(supabase),
    saveLastTotal: (basketId, totalCents) => saveLastTotal(supabase, basketId, totalCents),
    sendEmail: (message) => sendEmail(message),
    appUrl: process.env.APP_URL || DEFAULT_APP_URL,
  })
}

/**
 * @param {{ getSecret?: () => string|undefined, runCheck?: () => Promise<object> }} [deps]
 *   Both are replaceable for tests; the secret is read on every request.
 */
export function createJobsRouter({ getSecret = () => process.env.CRON_SECRET, runCheck = runWithSupabase } = {}) {
  const router = Router()
  router.get('/jobs/price-drop', async (req, res) => {
    const secret = getSecret()
    if (!secret) {
      console.error('[jobs] CRON_SECRET is not set, so the price-drop job cannot run.')
      return res.status(503).json({ error: SERVER_ERROR })
    }
    if (!hasCronSecret(req.get('authorization'), secret)) {
      return res.status(401).json({ error: 'Not allowed.', code: 'UNAUTHORIZED' })
    }
    try {
      const result = await runCheck()
      console.log(`[jobs] price-drop: ${JSON.stringify(result)}`) // counts only, never emails
      return res.json(result)
    } catch (error) {
      console.error(`[jobs] price-drop failed: ${error.message}`)
      return res.status(500).json({ error: SERVER_ERROR })
    }
  })
  return router
}
