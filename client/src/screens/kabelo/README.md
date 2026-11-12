# Kabelo's screens

| Screen | Issue | Suggested files | Stitch board |
|---|---|---|---|
| A1 Log in | #14 | `Login.jsx` | `docs/designs/queueless_account_screens*` |
| A2 Sign up | #14 | `Signup.jsx` | `docs/designs/queueless_account_screens*` |
| A3 Forgot / Reset password | #14 | `ForgotPassword.jsx`, `ResetPassword.jsx` | `docs/designs/queueless_account_screens*` |
| A4 Verify email | #14 | `VerifyEmail.jsx` | `docs/designs/queueless_account_screens*` |
| Privacy notice | #14 | `Privacy.jsx` | — |
| S3 Store Details | #12 | `StoreDetails.jsx`, `QueuePanel.jsx` | `docs/designs/queueless_s3_store_details*` |

Routes: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/privacy`, `/stores/:storeId` in `client/src/App.jsx`.
`PasswordField`, `Checkbox` and `useAuth` are shared by other screens, so they go in `components/ui/` and `hooks/`.
