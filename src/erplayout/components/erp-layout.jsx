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

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* storage unavailable — preference simply does not persist */
    }
  }, [collapsed])

  return (
    <div className="flex min-h-screen bg-ground text-ink">
      <ErpSidebar
        open={navOpen}
        onClose={() => setNavOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <ErpTopbar onMenu={() => setNavOpen(true)} />

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div key={pathname} className="ew-rise mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  )
}
