import { Link, useLocation, useNavigate } from 'react-router'
import { ArrowLeft, ShoppingBasket, User } from 'lucide-react'
import DesktopNav from './DesktopNav.jsx'
import { isAuthPath } from './navItems.js'
import { useBasketCount } from '../../hooks/useBasketCount.js'

const iconButton =
  'relative inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-surface-soft'

/**
 * "Queueless" title, back arrow (every screen except Home), profile and basket icons.
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
    <header className="sticky top-0 z-30 border-b border-border bg-bg">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-2 px-4 sm:h-20 sm:px-6">
        {!isHome && (
          <button type="button" onClick={goBack} aria-label="Go back" className={`${iconButton} -ml-2 sm:hidden`}>
            <ArrowLeft aria-hidden="true" className="size-6" />
          </button>
        )}
        <Link to="/" className="text-section font-bold text-primary sm:text-[28px]">
          Queueless
        </Link>

        {!authScreen && <DesktopNav />}

        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          {!authScreen && (
            <Link to="/savings" aria-label="Your profile and savings" className={iconButton}>
              <User aria-hidden="true" className="size-6" />
            </Link>
          )}
          <Link
            to="/basket"
            aria-label={basketCount > 0 ? `Basket, ${basketCount} items` : 'Basket'}
            className={iconButton}
          >
            <ShoppingBasket aria-hidden="true" className="size-6" />
            {basketCount > 0 && (
              <span className="absolute top-0.5 right-0.5 flex min-w-5 items-center justify-center rounded-full border-2 border-bg bg-primary px-1 text-[11px] leading-4 font-semibold text-white">
                {basketCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
