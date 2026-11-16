import { useId } from 'react'

/** Queueless mark: a ring with a dot slipping out of the line. The queue you skip. */
export default function Logo({ className = 'size-8' }) {
  const id = useId()
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" className={className}>
      <defs>
        <linearGradient id={id} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#52dcc4" />
          <stop offset="1" stopColor="#e6c887" />
        </linearGradient>
      </defs>
      <path d="M20.5 24.2A9.5 9.5 0 1 1 24.2 20.5" stroke={`url(#${id})`} strokeWidth="3" strokeLinecap="round" />
      <circle cx="26.4" cy="26.4" r="2.4" fill="#e6c887" />
    </svg>
  )
}
