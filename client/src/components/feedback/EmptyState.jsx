/** Soft grey block with an icon and a short message (e.g. empty basket). */
export default function EmptyState({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-surface-soft p-4 text-body text-muted">
      {Icon && <Icon aria-hidden="true" className="size-6 shrink-0" />}
      <p>{children}</p>
    </div>
  )
}
