import { Link, useLocation } from 'react-router'
import { navItems } from './navItems.js'

/** Mobile-only floating tab bar: Home / Basket / Savings / Stores, active tab in aqua. */
export default function BottomTabBar() {
  const { pathname } = useLocation()
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-4 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 rounded-full border border-border-strong/60 bg-surface/95 p-1.5 backdrop-blur-xl shadow-[0_18px_40px_-18px_rgb(0_0_0/0.8)] sm:hidden"
    >
      <ul className="grid grid-cols-4 gap-1">
        {navItems.map(({ to, label, Icon, matches }) => {
          const active = matches(pathname)
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-full text-[12px] transition-colors ${
                  active ? 'bg-primary/15 font-semibold text-primary' : 'text-muted'
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
