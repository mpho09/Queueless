import { Route, Routes } from 'react-router'
import AppShell from './components/layout/AppShell.jsx'
import Home from './pages/Home.jsx'
import Basket from './pages/Basket.jsx'
import Savings from './screens/refilwe/Savings.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import NotFound from './pages/NotFound.jsx'

// Route table from docs/Implementation plan.md §8.
// Screens not built yet show a placeholder that names their issue.
export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="search" element={<ComingSoon title="Search results" issue={11} />} />
        <Route path="stores/:storeId" element={<ComingSoon title="Store details" issue={12} />} />
        <Route path="stores/:storeId/report" element={<ComingSoon title="Report" issue={18} />} />
        <Route path="basket" element={<Basket />} />
        <Route path="savings" element={<Savings />} />
        <Route path="login" element={<ComingSoon title="Log in" issue={14} />} />
        <Route path="signup" element={<ComingSoon title="Sign up" issue={14} />} />
        <Route path="forgot-password" element={<ComingSoon title="Forgot password" issue={14} />} />
        <Route path="reset-password" element={<ComingSoon title="Set a new password" issue={14} />} />
        <Route path="verify-email" element={<ComingSoon title="Verify your email" issue={14} />} />
        <Route path="privacy" element={<ComingSoon title="Privacy Notice" issue={14} />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
