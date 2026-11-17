// BR1: price age warning (docs/IMPLEMENTATION_PLAN.md §6). Used on S2, S3 and S4.

export const STALE_AFTER_MS = 48 * 60 * 60 * 1000

/** True when a price was last verified MORE than 48 hours ago. */
export function isStale(verifiedAt, now = Date.now()) {
  if (verifiedAt == null) return false
  const time = new Date(verifiedAt).getTime()
  if (Number.isNaN(time)) return false
  return now - time > STALE_AFTER_MS
}

/** The badge text from the plan, shown on any stale price. */
export const STALE_LABEL = 'Unverified for 2 days'
