import { Search } from 'lucide-react'

/** Product search input with a leading search icon. */
export default function SearchField({ value, onChange, label = 'Search a product', placeholder = 'Search a product, e.g. White Sugar', className = '', ...props }) {
  return (
    <div className={`relative ${className}`}>
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-primary" />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="search"
        className="min-h-14 w-full rounded-input border border-border-strong bg-surface py-3 pr-4 pl-12 text-body text-ink placeholder:text-muted"
        {...props}
      />
    </div>
  )
}
