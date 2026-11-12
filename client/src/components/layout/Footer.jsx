import { Link } from 'react-router'

/** Footer: only the Privacy Notice link (plus the copyright line on desktop). */
export default function Footer() {
  return (
    <footer className="mt-auto sm:border-t sm:border-border">
      <div className="mx-auto flex max-w-[1200px] items-center justify-center px-4 py-6 sm:justify-between sm:px-6 sm:py-8">
        <p className="hidden text-body text-muted sm:block">© {new Date().getFullYear()} Queueless. All rights reserved.</p>
        <Link to="/privacy" className="inline-flex min-h-11 items-center text-caption text-muted underline sm:text-body sm:text-ink">
          Privacy Notice
        </Link>
      </div>
    </footer>
  )
}
