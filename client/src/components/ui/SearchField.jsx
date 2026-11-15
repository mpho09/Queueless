import { Search } from 'lucide-react'

/** Product search input with a leading search icon. */
export default function SearchField({ value, onChange, label = 'Search a product', placeholder = 'Search a product, e.g. White Sugar', className = '', ...props }) {
  return (
    <div className={`relative ${className}`}>
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="search"
        className="min-h-12 w-full rounded-input border border-border bg-bg py-3 pr-3 pl-10 text-body text-ink placeholder:text-muted focus:border-primary"
        {...props}
      />
    </div>
  )
}
