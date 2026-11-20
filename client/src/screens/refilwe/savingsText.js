// S6 text from the Stitch boards and the PRD. Plan §9.2 says these helper sentences
// can move to lib/messages.js; they stay here for now so this PR only touches this folder.

export const savingsText = {
  newUserTitle: 'Start comparing prices to track your savings.',
  newUserBody:
    'Add items to your basket and compare store promotions across South Africa to unlock instant rewards.',
  chartIntro: 'Track your verified grocery savings over the last 4 months.',
  pointsNote: 'Points are awarded automatically upon community verification.',
  logOutTitle: 'Log out of Queueless?',
  logOutBody: 'You will need to sign in again to submit reports and view your personal savings history.',
  deleteTitle: 'Delete your account?',
  deleteBody: 'Your profile, email logs and saved baskets will be permanently deleted within 7 days.',
  // Change email (PRD §5: verified through the existing address). New texts, not in the PRD yet.
  changeEmailTitle: 'Change email',
  changeEmailBody:
    "We'll send a confirmation link to your current email and to the new one. Your email changes once you've confirmed both.",
  changeEmailLabel: 'New email',
  changeEmailSubmit: 'Send confirmation links',
  changeEmailInvalid: 'Enter a valid email address.',
  changeEmailSame: 'That is already your email.',
  changeEmailSent: 'Confirmation links sent. Check both inboxes to finish changing your email.',
}
