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
    label: 'Calendar',
    to: '/erp/calendar',
    Icon: CalendarIcon,
    description: 'Bookings and schedules in one view.',
  },
  {
    label: 'Clients',
    to: '/erp/clients',
    Icon: ClientsIcon,
    description: 'Customer records and their details.',
  },
  {
    label: 'CRM',
    to: '/erp/crm',
    Icon: CrmIcon,
    description: 'Pipeline, leads, and follow-ups.',
  },
  {
    label: 'Resorts',
    to: '/erp/resorts',
    Icon: ResortsIcon,
    description: 'Resort listings, pricing, and imagery.',
  },
  {
    label: 'Packages',
    to: '/erp/packages',
    Icon: PackagesIcon,
    description: 'Itineraries, durations, and pricing.',
  },
  {
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
