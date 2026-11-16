import { Link, useLocation, useNavigate } from 'react-router'
import { ArrowLeft, ShoppingBasket, User } from 'lucide-react'
import DesktopNav from './DesktopNav.jsx'
import Logo from './Logo.jsx'
import { isAuthPath } from './navItems.js'
import { useBasketCount } from '../../hooks/useBasketCount.js'

const iconButton =
  'relative inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-raised hover:text-primary'

/**
 * "Queueless" wordmark, back arrow (every screen except Home), profile and basket icons.
 * From 640px up, the Home / Basket / Savings links sit in the centre.
 */
export default function GlobalHeader() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const basketCount = useBasketCount()
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
          {!authScreen && (
            <Link to="/savings" aria-label="Your profile and savings" className={iconButton}>
              <User aria-hidden="true" className="size-6" />
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
