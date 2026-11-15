import { useEffect } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'

/**
 * Short message pinned above the tab bar (mobile) or at the bottom (desktop).
 * Success toasts close themselves after `duration` ms; error toasts stay until dismissed or replaced.
 */
export default function Toast({ message, tone = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    if (!message || tone !== 'success' || !onClose) return undefined
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [message, tone, onClose, duration])

  if (!message) return null
  const error = tone === 'error'
  const Icon = error ? CircleAlert : CircleCheck

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 sm:bottom-6">
      <div
        role={error ? 'alert' : 'status'}
        className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-card px-4 py-3 text-body text-white shadow-lg ${error ? 'bg-red' : 'bg-ink'}`}
      >
        <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <p className="flex-1">{message}</p>
        {error && onClose && (
          <button type="button" onClick={onClose} className="-my-1 min-h-8 font-semibold underline">
            Close
          </button>
        )}
      </div>
    </div>
  )
}
