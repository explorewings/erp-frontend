import { ResortsIcon } from '../../components/icons.jsx'
import SectionPending from '../components/section-pending.jsx'

export default function Resorts() {
  return (
    <SectionPending
      title="Resorts"
      lead="Resort listings, pricing, and imagery."
      Icon={ResortsIcon}
      body="This section is scaffolded and ready. Build the resort list, its filters, and the editor for each listing here."
      note="Not connected to the catalogue API yet"
    />
  )
}
