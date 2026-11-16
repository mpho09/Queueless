import { Link } from 'react-router'

const base =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-button px-7 text-body font-semibold tracking-[0.005em] transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-none disabled:bg-grey-pill-bg disabled:text-muted disabled:shadow-none disabled:active:scale-100'

const variants = {
  primary:
    'bg-linear-to-b from-primary to-primary-pressed text-on-primary shadow-glow-aqua hover:brightness-110',
  secondary: 'border border-border-strong bg-transparent text-ink hover:border-primary hover:bg-surface-raised hover:text-primary',
  danger: 'bg-red text-on-red hover:brightness-110',
}

/** Capsule button (full-round, 48px min height). Pass `to` to render a link. */
export default function Button({ variant = 'primary', to, className = '', type = 'button', ...props }) {
  const classes = `${base} ${variants[variant]} ${className}`
  if (to) return <Link to={to} className={classes} {...props} />
  return <button type={type} className={classes} {...props} />
}
