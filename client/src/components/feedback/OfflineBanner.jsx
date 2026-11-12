import { WifiOff } from 'lucide-react'
import { useOnline } from '../../hooks/useOnline.js'
import { messages } from '../../lib/messages.js'

/** Grey bar under the header while the device is offline (PRD §12.2). */
export default function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div role="status" className="flex items-center gap-2 bg-muted px-4 py-2 text-caption font-medium text-white">
      <WifiOff aria-hidden="true" className="size-4 shrink-0" />
      {messages.offline}
    </div>
  )
}
