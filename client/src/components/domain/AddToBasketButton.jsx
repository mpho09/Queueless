import { useCallback, useState } from 'react'
import { ShoppingBasket } from 'lucide-react'
import Button from '../ui/Button.jsx'
import Toast from '../feedback/Toast.jsx'
import { useBasket } from '../../hooks/useBasket.js'
import { useOnline } from '../../hooks/useOnline.js'
import { messages } from '../../lib/messages.js'

/**
 * "Add to Basket" for S2 rows (#11 places it). Shows "Item added to your basket."
 * or the T-US2-2 failure message, and is disabled while offline.
 */
export default function AddToBasketButton({ productId, productName, className = '' }) {
  const { add } = useBasket()
  const online = useOnline()
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  async function handleClick() {
    setBusy(true)
    try {
      await add(productId)
      setToast({ tone: 'success', message: 'Item added to your basket.' })
    } catch {
      setToast({ tone: 'error', message: messages.addToBasketFailed })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        aria-label={`Add ${productName} to basket`}
        disabled={!online || busy}
        onClick={handleClick}
        className={`min-h-11 px-4 ${className}`}
      >
        <ShoppingBasket aria-hidden="true" className="size-5" />
        Add to Basket
      </Button>
      <Toast message={toast?.message} tone={toast?.tone} onClose={closeToast} />
    </>
  )
}
