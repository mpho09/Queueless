/**
 * Frame for the account screens (A1–A4, reset password): full width on mobile,
 * a centred 440px card on desktop (plan §8, Stitch account boards).
 */
export default function AuthCard({ title, children }) {
  return (
    <div className="mx-auto w-full max-w-[440px] pb-6 sm:mt-6 sm:rounded-card sm:border sm:border-border sm:bg-surface sm:p-8 sm:shadow-hairline">
      {title && <h1 className="mb-6 text-page-title font-semibold text-ink">{title}</h1>}
      {children}
    </div>
  )
}
