/** White card with a 1px border and 8px radius. */
export default function Card({ as: Tag = 'div', className = '', ...props }) {
  return <Tag className={`rounded-card border border-border bg-bg ${className}`} {...props} />
}
