import { CircleAlert } from 'lucide-react'
import { messages } from '../../lib/messages.js'
import Button from '../ui/Button.jsx'

/** "Something went wrong. Try again." block with a retry button. */
export default function ErrorState({ message = messages.serverError, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 rounded-card border border-red/30 bg-bg px-4 py-8 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-red-bg">
        <CircleAlert aria-hidden="true" className="size-5 text-red" />
      </span>
      <p className="text-body text-ink">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {messages.tryAgain}
        </Button>
      )}
    </div>
  )
}
