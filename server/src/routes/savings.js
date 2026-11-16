// GET /api/me/savings (#20): everything the Savings dashboard (S6) shows for the logged-in user.
// Response shape = client/src/screens/refilwe/sampleSavings.js, so S6 needs no changes.
//
// The log-in check is passed in. Once requireUser exists (#14), mount it with one line in index.js:
//   app.use('/api', createSavingsRouter({ requireUser }))
import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const SERVER_ERROR = 'Something went wrong. Try again.' // client/src/lib/messages.js serverError
const MONTHS_SHOWN = 4
const POINTS_PER_VERIFIED_REPORT = 10 // D4

const TITLES = { Queue: 'Queue report', Price: 'Price update', Stock: 'Stock update' }

/** Date → 'YYYY-MM-DD' in South African time (savings_events.saved_on uses the SAST day too). */
function sastDate(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(date)
}

/** The last `count` months as 'YYYY-MM', oldest first, ending with the current SAST month. */
function lastMonths(now, count) {
  const [year, month] = sastDate(now).split('-').map(Number)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 - (count - 1 - i), 1))
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  })
}

/**
 * Raw rows → the S6 response.
 * @param {{ now: Date, profile: { display_name: string|null, email: string, reward_points: number },
 *   events: { amount_cents: number, saved_on: string }[],
 *   reports: { id: string, report_type: string, is_verified: boolean, created_at: string, stores: { name: string }|null }[],
 *   reportsThisMonth: number }} rows
 */
export function buildSavingsSummary({ now, profile, events, reports, reportsThisMonth }) {
  const months = lastMonths(now, MONTHS_SHOWN)
  const centsByMonth = Object.fromEntries(months.map((m) => [m, 0]))
  for (const e of events) {
    const month = e.saved_on.slice(0, 7)
    if (month in centsByMonth) centsByMonth[month] += e.amount_cents
  }

  return {
    profile: {
      displayName: profile.display_name || profile.email.split('@')[0],
      email: profile.email,
    },
    monthTotalCents: centsByMonth[months.at(-1)],
    points: profile.reward_points,
    reportsThisMonth,
    last4Months: months.map((month) => ({ month, cents: centsByMonth[month] })),
    recent: reports.map((r) => ({
      id: r.id,
      title: `${TITLES[r.report_type] ?? 'Report'}${r.is_verified ? ' verified' : ''}`,
      storeName: r.stores?.name ?? '',
      at: r.created_at,
      points: r.is_verified ? POINTS_PER_VERIFIED_REPORT : 0,
    })),
  }
}

/**
 * Runs the queries for one user and builds the summary. The server uses the service role
 * (no RLS), so every query is filtered to `userId` here.
 */
export async function loadSavingsData(db, userId, now = new Date()) {
  const months = lastMonths(now, MONTHS_SHOWN)
  const thisMonthStart = `${months.at(-1)}-01T00:00:00+02:00` // SAST has no daylight saving

  const [profileRes, eventsRes, reportsRes, countRes] = await Promise.all([
    db.from('profiles').select('display_name, email, reward_points').eq('id', userId).maybeSingle(),
    db.from('savings_events').select('amount_cents, saved_on').eq('user_id', userId).gte('saved_on', `${months[0]}-01`),
    db
      .from('report_logs')
      .select('id, report_type, is_verified, created_at, stores(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
    db
      .from('report_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', thisMonthStart),
  ])

  const failed = [profileRes, eventsRes, reportsRes, countRes].find((r) => r.error)
  if (failed) throw new Error(failed.error.message)
  if (!profileRes.data) throw new Error(`No profile for user ${userId}`)

  return buildSavingsSummary({
    now,
    profile: profileRes.data,
    events: eventsRes.data ?? [],
    reports: reportsRes.data ?? [],
    reportsThisMonth: countRes.count ?? 0,
  })
}

async function loadFromSupabase(userId) {
  if (!supabase) throw new Error('Supabase is not configured on the server')
  return loadSavingsData(supabase, userId)
}

/**
 * @param {{ requireUser: import('express').RequestHandler,
 *   loadSummary?: (userId: string) => Promise<object> }} deps
 *   requireUser must set req.user.id or answer 401 itself. loadSummary is replaceable for tests.
 */
export function createSavingsRouter({ requireUser, loadSummary = loadFromSupabase }) {
  const router = Router()
  router.get('/me/savings', requireUser, async (req, res) => {
    try {
      res.json(await loadSummary(req.user.id))
    } catch (error) {
      console.error(`[savings] user ${req.user.id}: ${error.message}`)
      res.status(500).json({ error: SERVER_ERROR })
    }
  })
  return router
}
