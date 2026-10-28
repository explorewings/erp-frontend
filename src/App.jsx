import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './authetication/auth-provider.jsx'
import { useAuth } from './authetication/auth-context.js'
import Login from './authetication/pages/login.jsx'
import ErpLayout from './erplayout/components/erp-layout.jsx'
import { HOME_PATH } from './erplayout/nav.js'
import Calendar from './erplayout/pages/calendar.jsx'
import Resorts from './erplayout/pages/resorts.jsx'
import Packages from './erplayout/pages/packages.jsx'
import Clients from './erplayout/pages/clients.jsx'
import Crm from './erplayout/pages/crm.jsx'
import Settings from './settings/pages/settings.jsx'

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function LoginRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to={HOME_PATH} replace /> : <Login />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route
            path="/erp"
            element={
              <RequireAuth>
                <ErpLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="calendar" replace />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="resorts" element={<Resorts />} />
            <Route path="packages" element={<Packages />} />
            <Route path="clients" element={<Clients />} />
            <Route path="crm" element={<Crm />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="/" element={<Navigate to={HOME_PATH} replace />} />
          <Route path="*" element={<Navigate to={HOME_PATH} replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
