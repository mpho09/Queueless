// BR4: queue time-decay (docs/IMPLEMENTATION_PLAN.md BR4). The live level comes from the database
// view `store_queue_status` (migration queue_view); this is the same maths in JavaScript so it is
// unit-tested and can be used for sample data in development.

export const LEVELS = ['none', 'short', 'moderate', 'long']
export const WINDOW_MIN = 120
const FRESH_MIN = 15
const FRESH_WEIGHT = 0.8

/** How much a report counts, by its age in minutes: 0.8 up to 15 min, then down to 0 at 120 min. */
export function reportWeight(ageMin) {
  if (ageMin < 0 || ageMin >= WINDOW_MIN) return 0
  if (ageMin <= FRESH_MIN) return FRESH_WEIGHT
  return (FRESH_WEIGHT * (WINDOW_MIN - ageMin)) / (WINDOW_MIN - FRESH_MIN)
}

/**
 * The queue level from a store's reports: [{ level: 'long', createdAt }].
 * Returns 'unknown' when no report is younger than 120 minutes.
 */
export function queueLevel(reports, now = Date.now()) {
  let weightSum = 0
  let scoreSum = 0
  for (const report of reports) {
    const score = LEVELS.indexOf(report.level)
    if (score === -1) continue
    const weight = reportWeight((now - new Date(report.createdAt).getTime()) / 60000)
    weightSum += weight
    scoreSum += weight * score
  }
  if (weightSum === 0) return 'unknown'
  return LEVELS[Math.round(scoreSum / weightSum)]
}
