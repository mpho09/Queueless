import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router'
import GlobalHeader from './GlobalHeader.jsx'
import BottomTabBar from './BottomTabBar.jsx'
import Footer from './Footer.jsx'
import OfflineBanner from '../feedback/OfflineBanner.jsx'
import { SkeletonRows } from '../feedback/Skeleton.jsx'
import { showsTabBar } from './navItems.js'

/** Header, offline banner, page content, footer and (mobile) tab bar around every screen. */
export default function AppShell() {
  const { pathname } = useLocation()
  const tabBar = showsTabBar(pathname)

  return (
    <div className={`flex min-h-screen flex-col ${tabBar ? 'pb-16 sm:pb-0' : ''}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg focus:p-2">
        Skip to content
      </a>
      <GlobalHeader />
      <OfflineBanner />
      <main id="main" className="mx-auto w-full max-w-[1200px] px-4 pt-4 sm:px-6 sm:pt-12">
        <Suspense fallback={<SkeletonRows />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      {tabBar && <BottomTabBar />}
    </div>
  )
}
