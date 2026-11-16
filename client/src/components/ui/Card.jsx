/** Surface card: hairline border and a faint top highlight, no drop shadow. */
export default function Card({ as: Tag = 'div', className = '', ...props }) {
  return <Tag className={`rounded-card border border-border bg-surface shadow-hairline ${className}`} {...props} />
}
