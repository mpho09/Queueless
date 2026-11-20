import { useId } from 'react'

/** Native checkbox with a 44px tap row. `children` is the label, so it can hold a link. */
export default function Checkbox({ checked, onChange, children, className = '', ...props }) {
  const id = useId()
  return (
    <div className={`flex min-h-11 items-center gap-3 ${className}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 shrink-0 cursor-pointer accent-primary"
        {...props}
      />
      <label htmlFor={id} className="cursor-pointer text-body text-ink">
        {children}
      </label>
    </div>
  )
}
