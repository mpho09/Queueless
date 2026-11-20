import { Route, Routes } from 'react-router'
import AppShell from './components/layout/AppShell.jsx'
import Home from './pages/Home.jsx'
import Basket from './pages/Basket.jsx'
import Savings from './screens/refilwe/Savings.jsx'
import ReportSubmission from './screens/elias/ReportSubmission.jsx'
import StoreDetails from './screens/mpho/StoreDetails.jsx'
import StoresList from './screens/elias/StoresList.jsx'
import SearchResults from './screens/mpho/SearchResults.jsx'
import Login from './screens/kabelo/Login.jsx'
import Signup from './screens/kabelo/Signup.jsx'
import ForgotPassword from './screens/kabelo/ForgotPassword.jsx'
import ResetPassword from './screens/kabelo/ResetPassword.jsx'
import VerifyEmail from './screens/kabelo/VerifyEmail.jsx'
import Privacy from './screens/kabelo/Privacy.jsx'
import NotFound from './pages/NotFound.jsx'

// Route table from docs/Implementation plan.md §8.
// Screens not built yet show a placeholder that names their issue.
export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="search" element={<SearchResults />} />
        <Route path="stores" element={<StoresList />} />
        <Route path="stores/:storeId" element={<StoreDetails />} />
        <Route path="stores/:storeId/report" element={<ReportSubmission />} />
        <Route path="basket" element={<Basket />} />
        <Route path="savings" element={<Savings />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
