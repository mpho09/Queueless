import { Link, useLocation } from 'react-router'
import { navItems } from './navItems.js'

/** Mobile-only tab bar: Home / Basket / Savings, active tab in teal. */
export default function BottomTabBar() {
  const { pathname } = useLocation()
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="grid grid-cols-3">
        {navItems.map(({ to, label, Icon, matches }) => {
          const active = matches(pathname)
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[12px] ${
                  active ? 'font-semibold text-primary' : 'text-muted'
                }`}
              >
                <Icon aria-hidden="true" className="size-5" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
