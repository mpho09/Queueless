import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { messages } from '../../lib/messages.js'
import { isTooFarFromStore } from '../../utils/distance.js'
import { getShopperLocation, submitReport, toReportError } from './ReportApi.js'

// Thank-you toasts. The queue one is the exact text from the PRD (plan §10.1).
export const successToasts = {
  Queue: 'Queue report submitted. Thank you for your contribution!',
  Price: 'Price report submitted. Thank you for your contribution!',
  Stock: 'Stock report submitted. Thank you for your contribution!',
}

/**
 * Sends a report for the store and, on success, goes back to /stores/:storeId.
 * The toast (and the location warning, if any) travel in the router state, `{ toast, warning }`,
 * for the store page to show.
 *
 * submit({ reportType: 'Queue' | 'Price' | 'Stock', value, listingId })
 * Returns { submit, submitting, error, clearError, limitReached, locationMismatch }.
 *  - error: the message to show (queue/price limit, forbidden, ...)
 *  - limitReached: 'queue' | 'price' after a BR2 error, so the screen can disable Confirm
 */
export default function useSubmitReport({ storeId, store }) {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [limitReached, setLimitReached] = useState({ queue: false, price: false })
  const [locationMismatch, setLocationMismatch] = useState(false)

  const clearError = useCallback(() => setError(null), [])

  const submit = useCallback(
    async ({ reportType, value, listingId = null }) => {
      setError(null)
      setSubmitting(true)
      try {
        // More than 50 km away: still saved, but flagged so it is never verified.
        const shopper = await getShopperLocation()
        const tooFar = isTooFarFromStore(shopper, store)
        setLocationMismatch(tooFar)

        await submitReport({ storeId, reportType, value, listingId, locationMismatch: tooFar })

        navigate(`/stores/${storeId}`, {
          state: { toast: successToasts[reportType], warning: tooFar ? messages.locationMismatch : null },
        })
      } catch (caught) {
        const reportError = toReportError(caught, reportType)
        if (reportError.code === 'QUEUE_LIMIT') setLimitReached((prev) => ({ ...prev, queue: true }))
        if (reportError.code === 'PRICE_LIMIT') setLimitReached((prev) => ({ ...prev, price: true }))
        setError(reportError.message)
        setSubmitting(false)
      }
    },
    [navigate, store, storeId],
  )

  return { submit, submitting, error, clearError, limitReached, locationMismatch }
}
