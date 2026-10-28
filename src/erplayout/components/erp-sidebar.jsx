import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../nav.js'
import { LogoutIcon, PanelIcon } from '../../components/icons.jsx'
import { useSignOut } from '../../authetication/use-sign-out.js'

function BrandLockup({ collapsed }) {
  return (
    <div
      className={`flex items-center gap-3 px-3 ${
        collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : ''
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs border border-line bg-surface">
        <img
          src="/images/ewlogo.png"
          alt=""
          aria-hidden="true"
          className="h-6 w-6 object-contain"
        />
      </span>
      <span className={`min-w-0 leading-tight ${collapsed ? 'lg:hidden' : ''}`}>
        <span className="block truncate text-body font-semibold tracking-[-0.01em] text-ink">
          Explore Wings
        </span>
        <span className="block truncate text-label text-muted">Operations</span>
      </span>
    </div>
  )
}

export default function ErpSidebar({ open, onClose, collapsed, onToggleCollapse }) {
  const signOut = useSignOut()

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-ink/35 transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-line bg-surface transition-[transform,width] duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          collapsed ? 'lg:w-[72px]' : 'lg:w-64'
        } ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center border-b border-line px-3">
          <BrandLockup collapsed={collapsed} />
        </div>

        <nav className="flex-1 overflow-y-auto p-3" aria-label="Primary">
          <p
            className={`px-3 pb-3 text-micro font-semibold uppercase tracking-[0.08em] text-muted ${
              collapsed ? 'lg:hidden' : ''
            }`}
          >
            Menus
          </p>

          <ul className="divide-y divide-line overflow-hidden rounded-xs border border-line">
            {NAV_ITEMS.map(({ label, to, Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onClose}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    `group relative flex h-10 items-center gap-3 px-3 text-body-sm font-medium outline-none transition-colors focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-accent/15 ${
                      collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : ''
                    } ${
                      isActive
                        ? 'bg-[#cc785c] text-white'
                        : 'text-muted hover:bg-ground/70 hover:text-ink'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center ${
                          isActive ? 'text-white' : 'text-muted group-hover:text-accent'
                        }`}
                      >
                        <Icon />
                      </span>
                      <span className={`flex-1 truncate ${collapsed ? 'lg:hidden' : ''}`}>
                        {label}
                      </span>
                      {isActive && (
                        <span
                          className={`h-1.5 w-1.5 rounded-pill bg-white ${
                            collapsed ? 'lg:hidden' : ''
                          }`}
                        />
                      )}
                      {collapsed && isActive && (
                        <span
                          className="absolute right-1.5 top-1/2 hidden h-1.5 w-1.5 -translate-y-1/2 rounded-pill bg-white lg:block"
                          aria-hidden="true"
                        />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-line p-3">
          <div className={`flex items-center gap-2 ${collapsed ? 'lg:flex-col' : ''}`}>
            <button
              type="button"
              onClick={signOut}
              aria-label="Sign out"
              title={collapsed ? 'Sign out' : undefined}
              className={`flex h-10 flex-1 items-center gap-3 rounded-xs border border-danger-strong bg-danger px-3 text-body-sm font-medium text-white outline-none transition-colors hover:bg-danger-strong focus-visible:ring-4 focus-visible:ring-ink/25 ${
                collapsed
                  ? 'lg:order-2 lg:w-full lg:flex-none lg:justify-center lg:gap-0 lg:px-0'
                  : ''
              }`}
            >
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                <LogoutIcon />
              </span>
              <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>Sign out</span>
            </button>

            <button
              type="button"
              onClick={onToggleCollapse}
              aria-pressed={collapsed}
              aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
              title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
              className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xs border border-field text-muted outline-none transition-colors hover:bg-ground/70 hover:text-ink focus-visible:ring-4 focus-visible:ring-accent/15 lg:flex ${
                collapsed ? 'lg:order-1 lg:w-full' : ''
              }`}
            >
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                <PanelIcon />
              </span>
            </button>
          </div>

          {!collapsed && (
            <p className="mt-2 px-3 text-micro leading-relaxed text-muted">Console v0.1</p>
          )}
        </div>
      </aside>
    </>
  )
}
