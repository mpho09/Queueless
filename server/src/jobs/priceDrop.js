// Price-drop email (plan §10.1): when an active basket's cheapest complete total drops by
// more than 10% since the last check, email the shopper.
//
// runPriceDropCheck takes its database and email pieces as arguments, so it works with any
// scheduler. Vercel (our host, #15) has no always-on server, so an in-process timer like
// node-cron would never fire there; the schedule (e.g. Vercel Cron calling an API route, or
// Supabase pg_cron) and loading the baskets + emails are wired up once #14 and #15 land.

/** Same format as the app: 123450 → "R1,234.50" */
export function formatZARCents(cents) {
  const [rands, fraction] = (Math.abs(cents) / 100).toFixed(2).split('.')
  return `${cents < 0 ? '-' : ''}R${rands.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction}`
}

/**
 * Has the total dropped by MORE than 10%? Works in cents so there is no rounding drift.
 * @returns {{ dropped: boolean, diffCents: number }}
 */
export function checkPriceDrop(previousCents, currentCents) {
  if (!(previousCents > 0) || currentCents == null) return { dropped: false, diffCents: 0 }
  const diffCents = previousCents - currentCents
  return { dropped: diffCents * 10 > previousCents, diffCents: Math.max(diffCents, 0) }
}

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** The email text from plan §10.1, with a link to the basket (S4). */
export function priceDropEmail({ diffCents, storeName, appUrl }) {
  const subject = `Price drop alert: Your active grocery basket is now ${formatZARCents(diffCents)} cheaper at ${storeName}!`
  const link = `${appUrl.replace(/\/$/, '')}/basket`
  return {
    subject,
    text: `${subject}\n\nSee your basket: ${link}`,
    html: `<p>${escapeHtml(subject)}</p><p><a href="${escapeHtml(link)}">See your basket</a></p>`,
  }
}

/**
 * One run of the job.
 * @param {object} deps
 * @param {() => Promise<Array<{ basketId: string, email: string, lastTotalCents: number|null,
 *   cheapest: { storeName: string, totalCents: number } | null }>>} deps.getActiveBaskets
 *   `cheapest` is the cheapest COMPLETE store (BR3), or null when no store has every item.
 * @param {(basketId: string, totalCents: number) => Promise<void>} deps.saveLastTotal
 * @param {(email: { to: string, subject: string, text: string, html: string }) => Promise<unknown>} deps.sendEmail
 * @param {string} deps.appUrl  the live site, for the basket link
 * @returns {Promise<{ checked: number, emailed: number, failed: number }>}
 */
export async function runPriceDropCheck({ getActiveBaskets, saveLastTotal, sendEmail, appUrl }) {
  const baskets = await getActiveBaskets()
  let emailed = 0
  let failed = 0

  for (const basket of baskets) {
    // No store carries the whole basket: nothing to compare, keep the last total.
    if (!basket.cheapest) continue

    const current = basket.cheapest.totalCents
    const { dropped, diffCents } = checkPriceDrop(basket.lastTotalCents, current)
    if (dropped) {
      try {
        await sendEmail({
          to: basket.email,
          ref: `basket ${basket.basketId}`, // for logs: never log the email address (POPIA)
          ...priceDropEmail({ diffCents, storeName: basket.cheapest.storeName, appUrl }),
        })
        emailed += 1
      } catch (error) {
        // Keep the old total so the next run tries again.
        failed += 1
        console.error(`[priceDrop] email for basket ${basket.basketId} failed: ${error.message}`)
        continue
      }
    }

    // The saved total means "the price when we last told you". Only move it after an email,
    // on the first check, or when prices go UP; small drops keep the old total, so a slow
    // fall (5% a day) still adds up and triggers an email once it passes 10%.
    const firstCheck = !(basket.lastTotalCents > 0)
    if (dropped || firstCheck || current > basket.lastTotalCents) {
      await saveLastTotal(basket.basketId, current)
    }
  }

  return { checked: baskets.length, emailed, failed }
}
