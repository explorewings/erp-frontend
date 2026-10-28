import { PackagesIcon } from '../../components/icons.jsx'
import SectionPending from '../components/section-pending.jsx'

export default function Packages() {
  return (
    <SectionPending
      title="Packages"
      lead="Itineraries, durations, and pricing."
      Icon={PackagesIcon}
      body="Build the package list, the itinerary detail, and the editor here."
      note="Not connected to the catalogue API yet"
    />
  )
}
