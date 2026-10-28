import {
  LuChevronRight,
  LuCircleAlert,
  LuCircleCheck,
  LuEye,
  LuEyeOff,
  LuLogOut,
  LuMenu,
  LuPanelLeft,
  LuUsers,
} from 'react-icons/lu'
import { TbBeach } from 'react-icons/tb'
import { FaChartBar, FaHotel } from 'react-icons/fa'
import { VscSettingsCompact } from 'react-icons/vsc'
import { IoCalendarSharp } from 'react-icons/io5'

// Stroke-based sets (Lucide, Tabler) on a 24 grid: the stroke carries the weight and
// the fill stays empty. 1.75 is tuned down from the sets' default 2 to match the system's lighter line.
const outline = {
  size: 18,
  strokeWidth: 1.75,
  'aria-hidden': true,
  focusable: 'false',
}

// Solid sets (Ionicons, Font Awesome, Codicons) ink the whole silhouette, so they read much heavier
// than an outline glyph in the same box. They sit a step smaller to land at the same optical weight.
const solid = {
  size: 15,
  'aria-hidden': true,
  focusable: 'false',
}

export function CalendarIcon(props) {
  return <IoCalendarSharp {...solid} {...props} />
}

export function ResortsIcon(props) {
  return <FaHotel {...solid} {...props} />
}

export function PackagesIcon(props) {
  return <TbBeach {...outline} {...props} />
}

export function ClientsIcon(props) {
  return <LuUsers {...outline} {...props} />
}

export function CrmIcon(props) {
  return <FaChartBar {...solid} {...props} />
}

export function SettingsIcon(props) {
  return <VscSettingsCompact {...solid} size={16} {...props} />
}

export function ChevronIcon(props) {
  return <LuChevronRight {...outline} {...props} />
}

export function MenuIcon(props) {
  return <LuMenu {...outline} {...props} />
}

export function LogoutIcon(props) {
  return <LuLogOut {...outline} {...props} />
}

export function PanelIcon(props) {
  return <LuPanelLeft {...outline} {...props} />
}

export function EyeIcon(props) {
  return <LuEye {...outline} {...props} />
}

export function EyeOffIcon(props) {
  return <LuEyeOff {...outline} {...props} />
}

export function AlertIcon(props) {
  return <LuCircleAlert {...outline} {...props} />
}

export function CheckIcon(props) {
  return <LuCircleCheck {...outline} {...props} />
}
