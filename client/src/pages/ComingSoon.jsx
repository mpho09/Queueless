import Button from '../components/ui/Button.jsx'

/** Holds a route's place until its issue is built, so navigation works end to end. */
export default function ComingSoon({ title, issue }) {
  return (
    <div className="flex flex-col items-start gap-4 pb-6">
      <h1 className="text-page-title font-bold">{title}</h1>
      <p className="text-body text-muted">
        This screen is coming soon{issue ? ` (#${issue})` : ''}.
      </p>
      <Button to="/" variant="secondary">
        Back to Home
      </Button>
    </div>
  )
}
