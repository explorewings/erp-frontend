import {
  CalendarIcon,
  ClientsIcon,
  CrmIcon,
  PackagesIcon,
  ResortsIcon,
  SettingsIcon,
} from '../components/icons.jsx'

export const NAV_ITEMS = [
  {
    key: 'menu:calendar',
    label: 'Calendar',
    to: '/erp/calendar',
    Icon: CalendarIcon,
    description: 'Bookings and schedules in one view.',
  },
  {
    key: 'menu:clients',
    label: 'Clients',
    to: '/erp/clients',
    Icon: ClientsIcon,
    description: 'Customer records and their details.',
  },
  {
    key: 'menu:crm',
    label: 'CRM',
    to: '/erp/crm',
    Icon: CrmIcon,
    description: 'Pipeline, leads, and follow-ups.',
  },
  {
    key: 'menu:resorts',
    label: 'Resorts',
    to: '/erp/resorts',
    Icon: ResortsIcon,
    description: 'Resort listings, pricing, and imagery.',
  },
  {
    key: 'menu:packages',
    label: 'Packages',
    to: '/erp/packages',
    Icon: PackagesIcon,
    description: 'Itineraries, durations, and pricing.',
  },
  {
    key: 'menu:settings',
    label: 'Settings',
    to: '/erp/settings',
    Icon: SettingsIcon,
    description: 'Workspace preferences.',
  },
]

export const HOME_PATH = NAV_ITEMS[0].to

export function getSectionLabel(pathname) {
  const match = NAV_ITEMS.filter(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  ).sort((a, b) => b.to.length - a.to.length)[0]

  return match?.label ?? NAV_ITEMS[0].label
}

export const MENU_KEYS = NAV_ITEMS.map((item) => item.key)
