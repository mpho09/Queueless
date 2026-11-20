import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react'

/** The account screens (A1–A4): full width on mobile, a centred 440px card from 640px up. */
export default function AuthLayout({ title, children }) {
  return (
    <div className="mx-auto w-full max-w-[440px] pb-8 sm:mt-6 sm:rounded-panel sm:border sm:border-border sm:bg-surface sm:p-8 sm:shadow-[0_30px_80px_-40px_rgb(82_220_196/0.3)]">
      <h1 className="mb-6 text-page-title font-semibold text-ink sm:text-[30px] sm:leading-9">{title}</h1>
      {children}
    </div>
  )
}

const tones = {
  error: { Icon: CircleAlert, classes: 'border-red/40 bg-red-bg text-red', role: 'alert' },
  warning: { Icon: TriangleAlert, classes: 'border-amber/40 bg-amber-bg text-amber-text', role: 'status' },
  success: { Icon: CircleCheck, classes: 'border-savings/30 bg-green-bg text-savings', role: 'status' },
}

/** Message box at the top of a form: red for errors, amber for notices, green for success. */
export function Banner({ tone = 'error', children }) {
  const { Icon, classes, role } = tones[tone]
  return (
    <div role={role} className={`mb-5 flex items-start gap-3 rounded-input border px-4 py-3 text-caption font-semibold ${classes}`}>
      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <p>{children}</p>
    </div>
  )
}

/** Where to go after logging in: the page the person came from, never an external or account page. */
export function safeReturnPath(from) {
  if (typeof from !== 'string' || !from.startsWith('/')) return '/'

  try {
    const url = new URL(from, window.location.origin)

    // Never allow redirects to another website.
    if (url.origin !== window.location.origin) return '/'

    // Normalize the pathname before checking account routes.
    const pathname = url.pathname
      .toLowerCase()
      .replace(/\/+$/, '') || '/'

    const blockedPaths = [
      '/login',
      '/signup',
      '/forgot-password',
      '/reset-password',
      '/verify-email',
    ]

    if (blockedPaths.includes(pathname)) return '/'

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/'
  }
}
