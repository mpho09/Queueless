import { useEffect, useId, useRef } from 'react'

/**
 * Centred confirm modal, or a bottom sheet on mobile (`sheet`), over a dimmed page.
 * Escape or a tap on the dimmed area closes it; focus moves in and back out again.
 */
export default function Dialog({ title, titleIcon, onClose, sheet = false, children }) {
  const titleId = useId()
  const panelRef = useRef(null)

  useEffect(() => {
    const previous = document.activeElement
    panelRef.current?.querySelector('button, a[href]')?.focus()

    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus?.()
    }
  }, [onClose])

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-sm ${sheet ? 'items-end sm:items-center' : 'items-center px-4'}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full border border-border-strong/60 bg-surface-raised p-6 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)] ${sheet ? 'rounded-t-[28px] sm:max-w-sm sm:rounded-panel' : 'max-w-sm rounded-panel'}`}
      >
        {sheet && <div aria-hidden="true" className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-strong sm:hidden" />}
        <h2 id={titleId} className="flex items-center gap-2 text-section font-semibold text-ink">
          {titleIcon}
          {title}
        </h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  )
}
