import { Link } from 'react-router'

// Source: PRD §12.4 (POPIA). Plain language, one section per kind of personal information.
const rows = [
  {
    what: 'Email address',
    why: 'To sign you in and to send you verification and password-reset emails.',
    who: 'You and Queueless administrators only.',
    where: 'Supabase, EU (Stockholm, Sweden). This is a transfer outside South Africa, protected under POPIA section 72.',
    howLong: 'For as long as your account exists.',
    howDelete: 'Delete your account in Settings on the Savings screen.',
  },
  {
    what: 'Suburb preference',
    why: 'To show stores and prices near you on the Home screen.',
    who: 'You and Queueless administrators only.',
    where: 'Supabase, EU (Stockholm, Sweden). This is a transfer outside South Africa, protected under POPIA section 72.',
    howLong: 'For as long as your account exists.',
    howDelete: 'Change or clear it on the Home screen.',
  },
]

/** /privacy: the Privacy Notice linked from sign-up, Settings and the footer. */
export default function Privacy() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 pb-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-page-title font-semibold text-ink sm:text-[34px] sm:leading-10">Privacy Notice</h1>
        <p className="text-body text-muted">
          Queueless handles your personal information in line with South Africa&rsquo;s Protection of Personal Information Act (POPIA).
          Here is what we keep, why, and how you can remove it.
        </p>
      </header>

      <section aria-labelledby="what-we-keep" className="flex flex-col gap-4">
        <h2 id="what-we-keep" className="text-section font-semibold text-ink">
          What we keep
        </h2>
        {rows.map((row) => (
          <article key={row.what} className="rounded-card border border-border bg-surface p-5 shadow-hairline">
            <h3 className="font-display text-card-title font-semibold text-ink">{row.what}</h3>
            <dl className="mt-3 grid gap-3 text-body sm:grid-cols-[10rem_1fr]">
              {[
                ['Why we need it', row.why],
                ['Who can see it', row.who],
                ['Where it is stored', row.where],
                ['How long we keep it', row.howLong],
                ['How to delete it', row.howDelete],
              ].map(([term, detail]) => (
                <div key={term} className="contents">
                  <dt className="font-semibold text-muted">{term}</dt>
                  <dd className="text-ink">{detail}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </section>

      <section aria-labelledby="your-confirmations" className="flex flex-col gap-3">
        <h2 id="your-confirmations" className="text-section font-semibold text-ink">
          Your confirmations
        </h2>
        <p className="text-body text-ink">
          When you sign up, you confirm that you are 16 or older and that you agree to this notice. We store those two confirmations,
          and the time you gave them, with your profile. Queueless is not for anyone under 16.
        </p>
      </section>

      <section aria-labelledby="deleting" className="flex flex-col gap-3">
        <h2 id="deleting" className="text-section font-semibold text-ink">
          Deleting your data
        </h2>
        <p className="text-body text-ink">
          You can delete your account at any time in Settings. We remove your account and the information linked to it within 7 days.
        </p>
      </section>

      <Link to="/" className="inline-flex min-h-11 items-center text-body font-semibold text-primary hover:underline">
        Back to Home
      </Link>
    </div>
  )
}
