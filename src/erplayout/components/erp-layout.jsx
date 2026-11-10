import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../authetication/auth-context.js'
import ErpSidebar from './erp-sidebar.jsx'
import ErpTopbar from './erp-topbar.jsx'

const COLLAPSE_KEY = 'ew.erp.nav-collapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

export default function ErpLayout() {
  const { accessRefreshError } = useAuth()
  const [navOpen, setNavOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const { pathname } = useLocation()
  const isCrmPage = pathname.endsWith('/crm')
  const isWidePage = pathname.endsWith('/calendar')
  const isFullHeightPage =
    pathname.endsWith('/packages') ||
    pathname.endsWith('/resorts') ||
    isCrmPage

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* storage unavailable — preference simply does not persist */
    }
  }, [collapsed])

  return (
    <div className="flex h-screen overflow-hidden bg-ground text-ink">
      <ErpSidebar
        open={navOpen}
        onClose={() => setNavOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
      />

      <div className="flex h-screen min-h-0 min-w-0 flex-1 flex-col">
        <ErpTopbar onMenu={() => setNavOpen(true)} />

        <main
          className={`flex min-h-0 min-w-0 flex-1 flex-col px-4 ${
            isFullHeightPage
              ? `overflow-hidden pt-6 sm:px-8 ${isCrmPage ? 'sm:pt-8' : 'sm:pt-4'}`
              : 'overflow-y-auto py-6 sm:px-8 sm:py-8'
          }`}
        >
          {accessRefreshError ? (
            <p role="alert" className="mb-3 rounded-xs border border-danger/30 bg-danger/5 px-4 py-2 text-sm text-danger-strong">
              {accessRefreshError}
            </p>
          ) : null}
          <div
            key={pathname}
            className={
              isFullHeightPage
                ? 'flex min-h-0 w-full flex-1 flex-col'
                : `ew-rise mx-auto w-full ${isWidePage ? 'max-w-[110rem]' : 'max-w-6xl'}`
            }
          >
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  )
}
