import { Link, useLocation } from 'react-router'
import { navItems } from './navItems.js'

/** Home / Basket / Savings links in the header centre, 640px and up. */
export default function DesktopNav() {
  const { pathname } = useLocation()
  return (
    <nav aria-label="Main" className="mx-auto hidden items-center gap-1 rounded-full border border-border bg-surface-soft/70 p-1 sm:flex">
      {navItems.map(({ to, label, matches }) => {
        const active = matches(pathname)
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? 'page' : undefined}
            className={`rounded-full px-5 py-2 text-body font-semibold transition-colors ${
              active ? 'bg-primary/15 text-primary' : 'text-muted hover:text-ink'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
