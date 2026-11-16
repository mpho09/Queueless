import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { CircleDollarSign, LogOut, Settings, Shield, TriangleAlert } from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import ErrorState from '../../components/feedback/ErrorState.jsx'
import { Skeleton } from '../../components/feedback/Skeleton.jsx'
import Toast from '../../components/feedback/Toast.jsx'
import { useOnline } from '../../hooks/useOnline.js'
import { messages } from '../../lib/messages.js'
import AccountSettings from './AccountSettings.jsx'
import Dialog from './Dialog.jsx'
import ProfileCard from './ProfileCard.jsx'
import RecentActivity from './RecentActivity.jsx'
import SavingsChart from './SavingsChart.jsx'
import { SavedThisMonth, StatTile } from './SavingsSummary.jsx'
import { deleteAccount, logOut } from './savingsApi.js'
import { isNewUser } from './savingsFormat.js'
import { savingsText } from './savingsText.js'
import { useSavings } from './useSavings.js'

const menuItem =
  'flex min-h-12 w-full items-center gap-3 rounded-button border border-border px-4 text-left text-body text-ink hover:bg-surface-soft'

/**
 * S6 Savings Analytics Dashboard (#20): profile, saved this month, points, reports,
 * 4-month chart, recent activity and account settings (log out, delete account).
 */
export default function Savings() {
  const savings = useSavings()
  const online = useOnline()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // null | 'menu' | 'logout' | 'delete'
  const [dialog, setDialog] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const closeDialog = useCallback(() => setDialog(null), [])
  const closeError = useCallback(() => setError(null), [])

  async function run(action) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setDialog(null)
      queryClient.removeQueries({ queryKey: ['savings'] })
      navigate('/')
    } catch (e) {
      setDialog(null)
      setError(e?.message || messages.serverError)
    } finally {
      setBusy(false)
    }
  }

  if (savings.isPending) return <SavingsSkeleton />
  if (savings.isError) return <ErrorState onRetry={() => savings.refetch()} />

  const data = savings.data
  const currentMonth = data.last4Months.at(-1)?.month
  const newUser = isNewUser(data)

  return (
    <div className="flex flex-col gap-4 pb-6 sm:gap-6">
      <h1 className="sr-only">Your savings</h1>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        <ProfileCard profile={data.profile} onOpenMenu={() => setDialog('menu')} />
        <SavedThisMonth cents={data.monthTotalCents} month={currentMonth} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        <StatTile label="Reward points" value={data.points} />
        <StatTile label="Reports this month" value={data.reportsThisMonth} />
      </div>

      {newUser ? (
        <NewUserCard />
      ) : (
        <div className="grid gap-4 sm:grid-cols-[3fr_2fr] sm:gap-6">
          <SavingsChart months={data.last4Months} />
          {data.recent.length > 0 && <RecentActivity items={data.recent} />}
        </div>
      )}

      <AccountSettings
        disabled={!online || busy}
        onLogOut={() => setDialog('logout')}
        onDelete={() => setDialog('delete')}
      />

      {dialog === 'menu' && (
        <Dialog title="Account Menu" sheet onClose={closeDialog}>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className={menuItem}
              onClick={() => {
                setDialog(null)
                const heading = document.getElementById('settings-heading')
                heading?.scrollIntoView?.({ behavior: 'smooth' })
                heading?.focus()
              }}
            >
              <Settings aria-hidden="true" className="size-5" />
              Settings
            </button>
            <Link to="/privacy" className={menuItem}>
              <Shield aria-hidden="true" className="size-5" />
              Privacy Notice
            </Link>
            <button
              type="button"
              className={`${menuItem} border-red/30 bg-red-bg text-red hover:bg-red-bg disabled:opacity-60`}
              disabled={!online}
              onClick={() => setDialog('logout')}
            >
              <LogOut aria-hidden="true" className="size-5" />
              Log out
            </button>
            <Button variant="secondary" className="mt-2 w-full border-border text-ink" onClick={closeDialog}>
              Cancel
            </Button>
          </div>
        </Dialog>
      )}

      {dialog === 'logout' && (
        <Dialog title={savingsText.logOutTitle} onClose={closeDialog}>
          <p className="text-body text-muted">{savingsText.logOutBody}</p>
          <div className="mt-5 flex flex-col gap-3">
            <Button disabled={busy} onClick={() => run(logOut)}>
              Log out
            </Button>
            <Button variant="secondary" className="border-border text-ink" onClick={closeDialog}>
              Cancel
            </Button>
          </div>
        </Dialog>
      )}

      {dialog === 'delete' && (
        <Dialog
          title={savingsText.deleteTitle}
          titleIcon={<TriangleAlert aria-hidden="true" className="size-5 shrink-0 text-red" />}
          onClose={closeDialog}
        >
          <p className="text-body text-muted">{savingsText.deleteBody}</p>
          <div className="mt-5 flex flex-col gap-3">
            <Button variant="danger" disabled={busy} onClick={() => run(deleteAccount)}>
              Delete account
            </Button>
            <Button variant="secondary" className="border-border text-ink" onClick={closeDialog}>
              Cancel
            </Button>
          </div>
        </Dialog>
      )}

      <Toast message={error} tone="error" onClose={closeError} />
    </div>
  )
}

function NewUserCard() {
  return (
    <Card className="flex flex-col items-center gap-3 px-4 py-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-green-bg">
        <CircleDollarSign aria-hidden="true" className="size-6 text-savings" />
      </span>
      <p className="text-body font-semibold text-ink">{savingsText.newUserTitle}</p>
      <p className="max-w-sm text-caption text-muted">{savingsText.newUserBody}</p>
    </Card>
  )
}

function SavingsSkeleton() {
  return (
    <div role="status" aria-label="Loading your savings" className="flex flex-col gap-4 pb-6 sm:gap-6">
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        <Skeleton className="h-20 rounded-card" />
        <Skeleton className="h-24 rounded-card" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        <Skeleton className="h-20 rounded-card" />
        <Skeleton className="h-20 rounded-card" />
      </div>
      <Skeleton className="h-64 rounded-card" />
      <Skeleton className="h-40 rounded-card" />
    </div>
  )
}
