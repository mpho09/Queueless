import { useState } from 'react'
import { useLocation, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { MapPinOff } from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import Toast from '../../components/feedback/Toast.jsx'
import ErrorState from '../../components/feedback/ErrorState.jsx'
import { SkeletonRows } from '../../components/feedback/Skeleton.jsx'
import { fetchStore } from './ReportApi.js'

/**
 * TEMPORARY stand-in for S3 Store Details (#12, Kabelo) so S5 can be reached and the thank-you toast seen.
 * When S3 is built, replace this route in App.jsx with the real page. S3 needs only two things from here:
 *  - a "Report Queue Status" button linking to `/stores/${storeId}/report`
 *  - to show `location.state.toast` (and `location.state.warning`) that S5 sends back after a report
 */
export default function StorePlaceholder() {
  const { storeId } = useParams()
  const { state } = useLocation()
  const [toast, setToast] = useState(state?.toast ?? null)
  const storeQuery = useQuery({ queryKey: ['report-store', storeId], queryFn: () => fetchStore(storeId) })

  if (storeQuery.isPending) return <SkeletonRows count={2} label="Loading store" />
  if (storeQuery.isError) return <ErrorState message={storeQuery.error?.message} onRetry={() => storeQuery.refetch()} />

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 pb-8">
      <h1 className="text-page-title font-bold text-ink">{storeQuery.data.name}</h1>
      <Card className="flex flex-col gap-3 p-4">
        <p className="text-body text-muted">Store details are coming soon (#12).</p>
        <Button to={`/stores/${storeId}/report`}>Report Queue Status</Button>
      </Card>
      {state?.warning && (
        <p role="status" className="flex items-center gap-2 rounded-card border border-amber/40 bg-amber-bg px-3 py-2 text-caption font-medium text-amber-text">
          <MapPinOff aria-hidden="true" className="size-4 shrink-0 text-amber" />
          {state.warning}
        </p>
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
