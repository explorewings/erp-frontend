import { ClientsIcon } from '../../components/icons.jsx'
import SectionPending from '../components/section-pending.jsx'

export default function Clients() {
  return (
    <SectionPending
      title="Clients"
      lead="Customer records and their details."
      Icon={ClientsIcon}
      body="Build the client list, the profile view, and the editor here."
      note="No client data source yet"
    />
  )
}
