import { EllipsisVertical } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import { initials } from './savingsFormat.js'

/** Avatar with initials, name, email and the ⋮ account menu button. */
export default function ProfileCard({ profile, onOpenMenu }) {
  return (
    <Card className="flex items-center gap-4 p-4 sm:p-6">
      <span
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-body font-semibold text-white sm:size-16 sm:text-section"
      >
        {initials(profile.displayName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold text-ink sm:text-[26px] sm:leading-8">{profile.displayName}</p>
        <p className="truncate text-caption text-muted sm:text-body">{profile.email}</p>
      </div>
      <button
        type="button"
        aria-label="Account menu"
        onClick={onOpenMenu}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-soft hover:text-ink"
      >
        <EllipsisVertical aria-hidden="true" className="size-5" />
      </button>
    </Card>
  )
}
