import Button from '../components/ui/Button.jsx'

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4 pb-6">
      <h1 className="text-page-title font-bold">Page not found</h1>
      <p className="text-body text-muted">We couldn't find that page.</p>
      <Button to="/">Back to Home</Button>
    </div>
  )
}
