import { CalendarIcon } from '../../components/icons.jsx'
import SectionPending from '../components/section-pending.jsx'

export default function Calendar() {
  return (
    <SectionPending
      title="Calendar"
      lead="Bookings and schedules in one view."
      Icon={CalendarIcon}
      body="Build the month and week views over bookings and departures here."
      note="No scheduling data source yet"
    />
  )
}
