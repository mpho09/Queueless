import { TriangleAlert } from 'lucide-react'

/** "Missing 1 Item" / "Missing 2 Items" on a store that doesn't carry everything (BR3). */
export default function MissingItemsPill({ count }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber/40 bg-amber-bg px-3 py-1 text-caption font-medium text-amber-text">
      <TriangleAlert aria-hidden="true" className="size-4" />
      Missing {count} {count === 1 ? 'Item' : 'Items'}
    </span>
  )
}
