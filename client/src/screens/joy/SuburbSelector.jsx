import { MapPin, X } from 'lucide-react'
import Select from '../../components/ui/Select.jsx'

export const ALL_SUBURBS = 'all'

/** F4 (#19): Suburb selector built on Select, useSuburb, and Stitch design tokens. */
export default function SuburbSelector({
  suburbs = [],
  value,
  suburbName,
  onChange,
  disabled = false,
  online = true,
  ready = true,
  className = '',
}) {
  const isFiltered = Boolean(value && value !== ALL_SUBURBS)
  const showingText = `Showing stores in ${suburbName || 'all suburbs'}${online ? '' : ' (Cached)'}`

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-end gap-2">
        <Select
          label="Your suburb"
          value={value ?? ''}
          onChange={(id) => onChange(id || ALL_SUBURBS)}
          options={[
            ...suburbs.map((s) => ({ value: s.id, label: s.name })),
            { value: ALL_SUBURBS, label: 'All suburbs' },
          ]}
          disabled={disabled}
          className="flex-1"
        />
        {isFiltered && (
          <button
            type="button"
            onClick={() => onChange(ALL_SUBURBS)}
            aria-label="Clear suburb filter"
            className="inline-flex min-h-12 shrink-0 items-center gap-1 rounded-card border border-border bg-surface-soft px-3 py-2 text-caption font-medium text-muted hover:border-primary hover:text-ink"
          >
            <X aria-hidden="true" className="size-4" />
            Clear
          </button>
        )}
      </div>
      {ready && (
        <p className="flex items-center gap-1 text-caption text-muted">
          <MapPin aria-hidden="true" className="size-4 shrink-0" />
          {showingText}
        </p>
      )}
    </div>
  )
}
