import { Link } from 'react-router'

const base =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-button px-6 text-body font-semibold transition-colors disabled:cursor-not-allowed disabled:border-transparent disabled:bg-grey-pill-bg disabled:text-muted'

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-pressed active:bg-primary-pressed',
  secondary: 'border border-primary bg-bg text-primary hover:bg-green-bg active:bg-green-bg',
  danger: 'bg-red text-white hover:bg-[#9F1F1F] active:bg-[#9F1F1F]',
}

/** Capsule button from the design system (24px radius, 48px min height). Pass `to` to render a link. */
export default function Button({ variant = 'primary', to, className = '', type = 'button', ...props }) {
  const classes = `${base} ${variants[variant]} ${className}`
  if (to) return <Link to={to} className={classes} {...props} />
  return <button type={type} className={classes} {...props} />
}
