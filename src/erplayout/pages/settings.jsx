import { SettingsIcon } from '../../components/icons.jsx'
import SectionPending from '../components/section-pending.jsx'

export default function Settings() {
  return (
    <SectionPending
      title="Settings"
      lead="Workspace preferences."
      Icon={SettingsIcon}
      body="Build the workspace settings — profile, security, and defaults — here."
      note="No settings persisted yet"
    />
  )
}
