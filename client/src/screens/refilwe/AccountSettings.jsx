import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'

const row =
  'flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left text-body hover:bg-surface-soft disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-transparent sm:px-6'

/**
 * Settings list: Change email, Privacy Notice, Delete account, Log out.
 * Change email needs log-in (#14), so it stays disabled until then.
 */
export default function AccountSettings({ onLogOut, onDelete, disabled }) {
  return (
    <section aria-labelledby="settings-heading" className="rounded-card border border-border bg-bg">
      <h2
        id="settings-heading"
        tabIndex={-1}
        className="px-4 pt-4 pb-3 text-body font-semibold text-ink outline-none sm:px-6 sm:pt-6 sm:text-[24px] sm:leading-8"
      >
        Settings
      </h2>
      <ul className="divide-y divide-border border-t border-border">
        <li>
          <button type="button" className={row} disabled>
            Change email
            <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
          </button>
        </li>
        <li>
          <Link to="/privacy" className={row}>
            Privacy Notice
            <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted" />
          </Link>
        </li>
        <li>
          <button type="button" className={`${row} text-red`} disabled={disabled} onClick={onDelete}>
            Delete account
            <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
          </button>
        </li>
        <li>
          <button type="button" className={`${row} text-ink`} disabled={disabled} onClick={onLogOut}>
            Log out
            <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted" />
          </button>
        </li>
      </ul>
    </section>
  )
}
