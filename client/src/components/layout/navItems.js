import { Home, PiggyBank, ShoppingBasket } from 'lucide-react'

// Main sections, shared by the mobile tab bar and the desktop nav (docs/Implementation plan.md §8).
export const navItems = [
  { to: '/', label: 'Home', Icon: Home, matches: (path) => path === '/' || path.startsWith('/search') || path.startsWith('/stores') },
  { to: '/basket', label: 'Basket', Icon: ShoppingBasket, matches: (path) => path.startsWith('/basket') },
  { to: '/savings', label: 'Savings', Icon: PiggyBank, matches: (path) => path.startsWith('/savings') },
]

const AUTH_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email']

/** Account screens (A1–A4) show the header only: no nav links, no tab bar. */
export function isAuthPath(path) {
  return AUTH_PATHS.includes(path)
}

/** The tab bar is hidden on S5 (report) and the account screens. */
export function showsTabBar(path) {
  return !isAuthPath(path) && !/^\/stores\/[^/]+\/report/.test(path)
}
