import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './authetication/auth-provider.jsx'
import { useAuth } from './authetication/auth-context.js'
import Login from './authetication/pages/login.jsx'
import ErpLayout from './erplayout/components/erp-layout.jsx'
import { NAV_ITEMS } from './erplayout/nav.js'
import Calendar from './calendar/pages/calendar.jsx'
import Resorts from './resorts/pages/resorts.jsx'
import Packages from './packages/pages/packages.jsx'
import Clients from './clients/pages/clients.jsx'
import Crm from './crm/pages/crm.jsx'
import Settings from './settings/pages/settings.jsx'
import Reports from './reports/pages/reports.jsx'

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function RequireSuperadmin({ children }) {
  const { user, menuAccessLoading } = useAuth()
  if (menuAccessLoading) return null
  if (user?.role !== 'superadmin' && user?.role !== 'superuser') {
    return <Navigate to="/erp" replace />
  }
  return children
}

function RequireMenuAccess({ menuKey, children }) {
  const { canAccess, menuAccessLoading, user } = useAuth()
  const isSuperuser = user?.role === 'superadmin' || user?.role === 'superuser'
  if (menuAccessLoading && !isSuperuser) return null
  if (canAccess(menuKey)) return children
  const fallback = NAV_ITEMS.find((item) => item.key !== menuKey && canAccess(item.key))
  return <Navigate to={fallback?.to ?? '/erp/no-access'} replace />
}

function HomeRoute() {
  const { canAccess, menuAccessLoading, user } = useAuth()
  const isSuperuser = user?.role === 'superadmin' || user?.role === 'superuser'
  if (menuAccessLoading && !isSuperuser) return null
  // Prefer the calendar, then fall back to the first allowed menu in nav order.
  const allowed = NAV_ITEMS.filter((item) => canAccess(item.key))
  const target = allowed.find((item) => item.key === 'menu:calendar') ?? allowed[0]
  return <Navigate to={target?.to ?? '/erp/no-access'} replace />
}

function NoMenuAccess() {
  const { accessRefreshError, menuAccessLoading, refreshMenuAccess } = useAuth()
  if (menuAccessLoading) return null
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <h1 className="text-title font-semibold text-ink">
        {accessRefreshError ? 'Unable to load your access' : 'No menu access assigned'}
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        {accessRefreshError
          ? accessRefreshError
          : 'Ask a superadmin to grant access to the sections you need.'}
      </p>
      {accessRefreshError ? (
        <button
          type="button"
          onClick={() => void refreshMenuAccess?.()}
          className="mt-4 rounded-xs border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-ground"
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}

function LoginRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/erp" replace /> : <Login />
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
            <Route index element={<HomeRoute />} />
            <Route path="no-access" element={<NoMenuAccess />} />
            <Route path="calendar" element={<RequireMenuAccess menuKey="menu:calendar"><Calendar /></RequireMenuAccess>} />
            <Route path="resorts" element={<RequireMenuAccess menuKey="menu:resorts"><Resorts /></RequireMenuAccess>} />
            <Route path="packages" element={<RequireMenuAccess menuKey="menu:packages"><Packages /></RequireMenuAccess>} />
            <Route path="reports" element={<RequireMenuAccess menuKey="menu:reports"><Reports /></RequireMenuAccess>} />
            <Route path="clients" element={<RequireMenuAccess menuKey="menu:clients"><Clients /></RequireMenuAccess>} />
            <Route path="crm" element={<RequireMenuAccess menuKey="menu:crm"><Crm /></RequireMenuAccess>} />
            <Route path="settings" element={<RequireSuperadmin><RequireMenuAccess menuKey="menu:settings"><Settings /></RequireMenuAccess></RequireSuperadmin>} />
          </Route>
          <Route path="/" element={<Navigate to="/erp" replace />} />
          <Route path="*" element={<Navigate to="/erp" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
