// Sample responses for GET /api/me/savings (shape agreed in ./README.md), matching the
// test shopper Joy Mokoena from the seed data. Used until the API route and log-in (#14) exist.
// All money is in cents.

export const sampleSavings = {
  profile: { displayName: 'Joy Mokoena', email: 'tester.joy@queueless.co.za' },
  monthTotalCents: 15240,
  points: 120,
  reportsThisMonth: 8,
  last4Months: [
    { month: '2026-08', cents: 9620 },
    { month: '2026-09', cents: 11875 },
    { month: '2026-10', cents: 14010 },
    { month: '2026-11', cents: 15240 },
  ],
  recent: [
    {
      id: 'sample-activity-1',
      title: 'Queue report verified',
      storeName: 'Shoprite Hatfield',
      at: '2026-11-11T14:05:00+02:00',
      points: 10,
    },
    {
      id: 'sample-activity-2',
      title: 'Price update',
      storeName: 'Pick n Pay Hatfield',
      at: '2026-11-10T10:22:00+02:00',
      points: 0,
    },
  ],
}

/** A shopper who has just signed up: nothing saved or reported yet (Stitch "New user" frame). */
export const emptySavings = {
  profile: sampleSavings.profile,
  monthTotalCents: 0,
  points: 0,
  reportsThisMonth: 0,
  last4Months: sampleSavings.last4Months.map(({ month }) => ({ month, cents: 0 })),
  recent: [],
}
