// Every user-facing error and status string, with the exact text from the PRD
// (docs/Implementation plan.md §10.2). Import from here; don't retype them in components.

export const messages = {
  offline: "You're offline. Changes will not be saved.",
  serverError: 'Something went wrong. Try again.',
  tryAgain: 'Try again',
  sessionExpired: 'Session expired. Please log in again to save your changes.',
  forbidden: "You can't do that.",
  addToBasketFailed: 'Action failed. Please verify your internet connection and try again.',
  noSearchResults: 'No products found matching your search term. Please try another product name.',
  priceUnavailable: 'Price unavailable at this branch',
  locationMismatch: 'Location mismatch alert',
  loginFailed: 'Incorrect email or password.',
  accountLocked: 'Account locked for 15 minutes after 5 incorrect attempts.',
  passwordRules: 'Password must include at least 1 uppercase letter and 1 number',
  invalidPrice: 'Enter a valid price, e.g. 34.99',
  queueLimit: 'Submission limit reached. You can submit up to 5 queue reports per store per hour.',
  priceLimit: 'Submission limit reached. You can submit up to 3 price updates per store per hour.',
  emptyBasket: 'Your basket is empty. Search for a product to start.',
  noStores: 'No stores found in this suburb yet.',
}
