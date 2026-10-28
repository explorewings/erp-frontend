import { CrmIcon } from '../../components/icons.jsx'
import SectionPending from '../components/section-pending.jsx'

export default function Crm() {
  return (
    <SectionPending
      title="CRM"
      lead="Pipeline, leads, and follow-ups."
      Icon={CrmIcon}
      body="Build the pipeline board, lead capture, and follow-up reminders here."
      note="No CRM data source yet"
    />
  )
}
