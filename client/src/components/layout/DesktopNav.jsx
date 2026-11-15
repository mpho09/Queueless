import { Link, useLocation } from 'react-router'
import { navItems } from './navItems.js'

/** Home / Basket / Savings links in the header centre, 640px and up. */
export default function DesktopNav() {
  const { pathname } = useLocation()
  return (
    <nav aria-label="Main" className="mx-auto hidden h-full items-stretch gap-8 sm:flex">
      {navItems.map(({ to, label, matches }) => {
        const active = matches(pathname)
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center border-b-2 px-1 text-card-title ${
              active ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
