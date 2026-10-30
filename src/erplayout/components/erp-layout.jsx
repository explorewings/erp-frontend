import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
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
  const [navOpen, setNavOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const { pathname } = useLocation()
  const isPackagesPage = pathname.endsWith('/packages')

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
            isPackagesPage
              ? 'overflow-hidden pt-6 sm:px-8 sm:pt-8'
              : 'overflow-y-auto py-6 sm:px-8 sm:py-8'
          }`}
        >
          <div
            key={pathname}
            className={
              isPackagesPage
                ? 'flex min-h-0 w-full flex-1 flex-col'
                : 'ew-rise mx-auto w-full max-w-6xl'
            }
          >
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  )
}
