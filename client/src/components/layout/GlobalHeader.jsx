import { Link, useLocation, useNavigate } from 'react-router'
import { ArrowLeft, ShoppingBasket, User } from 'lucide-react'
import DesktopNav from './DesktopNav.jsx'
import Logo from './Logo.jsx'
import { isAuthPath } from './navItems.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useBasketCount } from '../../hooks/useBasketCount.js'
import { useNotifications } from '../../screens/refilwe/useNotifications.js'

const iconButton =
  'relative inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-raised hover:text-primary'

/**
 * "Queueless" wordmark, back arrow (every screen except Home), profile and basket icons.
 * From 640px up, the Home / Basket / Savings links sit in the centre.
 */
export default function GlobalHeader() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const basketCount = useBasketCount()
  const unreadCount = useNotifications().unread.length
  const { isLoggedIn, loading } = useAuth()
  const isHome = pathname === '/'
  const authScreen = isAuthPath(pathname)

  function goBack() {
    // Go back inside the app when there is history, otherwise to Home.
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/')
  }

  return (
    <header className="glass sticky top-0 z-30 border-b border-border/70">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-2 px-4 sm:h-20 sm:px-6">
        {!isHome && (
          <button type="button" onClick={goBack} aria-label="Go back" className={`${iconButton} -ml-2 sm:hidden`}>
            <ArrowLeft aria-hidden="true" className="size-6" />
          </button>
        )}
        <Link to="/" className="flex items-center gap-2.5 font-display text-[20px] font-semibold tracking-tight text-ink sm:text-[24px]">
          <Logo className="size-7 sm:size-8" />
          Queueless
        </Link>

        {!authScreen && <DesktopNav />}

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {/* Guests get "Log in"; people who are logged in get their profile (Savings and Settings). */}
          {!authScreen && !loading && !isLoggedIn && (
            <Link
              to="/login"
              state={{ from: pathname + search }}
              className="inline-flex min-h-11 items-center rounded-full border border-border-strong px-4 text-body font-semibold text-primary transition-colors hover:border-primary hover:bg-surface-raised"
            >
              Log in
            </Link>
          )}
          {!authScreen && isLoggedIn && (
            <Link
              to="/savings"
              aria-label={
                unreadCount > 0
                  ? `Your profile and savings, ${unreadCount} new ${unreadCount === 1 ? 'notification' : 'notifications'}`
                  : 'Your profile and savings'
              }
              className={iconButton}
            >
              <User aria-hidden="true" className="size-6" />
              {unreadCount > 0 && (
                <span
                  data-testid="unread-dot"
                  className="absolute top-1.5 right-1.5 size-2.5 rounded-full border-2 border-bg bg-savings"
                />
              )}
            </Link>
          )}
          <Link
            to="/basket"
            aria-label={
              basketCount > 0 ? `Basket, ${basketCount} ${basketCount === 1 ? 'item' : 'items'}` : 'Basket'
            }
            className={iconButton}
          >
            <ShoppingBasket aria-hidden="true" className="size-6" />
            {basketCount > 0 && (
              <span className="absolute top-0.5 right-0.5 flex min-w-5 items-center justify-center rounded-full border-2 border-bg bg-primary px-1 text-[11px] leading-4 font-bold text-on-primary">
                {basketCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
