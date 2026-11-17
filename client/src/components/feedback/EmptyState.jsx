/** Soft panel with an icon and a short message (e.g. empty basket). */
export default function EmptyState({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-4 rounded-card border border-dashed border-border-strong bg-surface-soft p-5 text-body text-muted">
      {Icon && (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      )}
      <p>{children}</p>
    </div>
  )
}
