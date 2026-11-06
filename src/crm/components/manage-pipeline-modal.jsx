import { useState } from 'react'
import { LuX } from 'react-icons/lu'
import CreatePipelineWizard, { StepIndicator } from './create-pipeline-wizard.jsx'
import PipelineList from './pipeline-list.jsx'
import SlidingTabs from './sliding-tabs.jsx'

const TABS = [
  { id: 'manage', label: 'Manage' },
  { id: 'create', label: 'Create' },
]

/**
 * Pipeline manager: Manage tab (rename/delete) and Create tab (wizard).
 * Pipelines come from the CRM page; this modal never fetches its own copy.
 * The dialog mounts fresh on every open, so no state survives a close.
 */
export default function ManagePipelineModal({ open, ...props }) {
  if (!open) return null
  return <PipelineManagerDialog {...props} />
}

function PipelineManagerDialog({
  token,
  user,
  pipelines,
  isLoading,
  loadError,
  onRetry,
  initialTab = 'manage',
  onClose,
  onCreated,
  onRenamed,
  onDeleted,
}) {
  const [activeTab, setActiveTab] = useState(initialTab === 'create' ? 'create' : 'manage')
  const [createStep, setCreateStep] = useState(1)
  const [isBusy, setIsBusy] = useState(false)
  // Bumped after a successful create so the wizard starts over.
  const [wizardKey, setWizardKey] = useState(0)

  const handleCreated = (created) => {
    onCreated(created)
    setWizardKey((key) => key + 1)
    setCreateStep(1)
    setActiveTab('manage')
  }

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 backdrop-blur-sm"
        aria-label="Close pipeline manager"
        onClick={() => {
          if (!isBusy) onClose()
        }}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pipeline-manager-title"
        className="relative flex max-h-[90vh] w-full max-w-[40rem] flex-col rounded-control border bg-surface shadow-2xl"
        style={{ borderColor: 'var(--ew-line)' }}
      >
        <header className="flex items-start justify-between gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--ew-line)' }}>
          <div>
            <h2 id="pipeline-manager-title" className="text-sm font-semibold text-[var(--ew-ink)]">
              Manage pipelines
            </h2>
            <p className="mt-1 text-xs text-[var(--ew-muted)]">Create and manage the pipelines used by your CRM board.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close pipeline manager"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs text-[var(--ew-muted)] hover:bg-ground/70"
          >
            <LuX className="h-4 w-4" />
          </button>
        </header>

        <div className="flex items-center justify-between gap-4 border-b px-5 py-3" style={{ borderColor: 'var(--ew-line)' }}>
          <SlidingTabs
            tabs={TABS}
            activeTab={activeTab}
            onChange={setActiveTab}
            ariaLabel="Pipeline management views"
            idPrefix="pipeline-manager"
          />
          {activeTab === 'create' ? <StepIndicator step={createStep} /> : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {/* Both panels stay mounted so switching tabs keeps unsaved wizard input. */}
          <div id="pipeline-manager-panel-manage" role="tabpanel" hidden={activeTab !== 'manage'}>
            <PipelineList
              token={token}
              pipelines={pipelines}
              isLoading={isLoading}
              error={loadError}
              onRetry={onRetry}
              onRenamed={onRenamed}
              onDeleted={onDeleted}
            />
          </div>
          <div id="pipeline-manager-panel-create" role="tabpanel" hidden={activeTab !== 'create'}>
            <CreatePipelineWizard
              key={wizardKey}
              token={token}
              user={user}
              step={createStep}
              onStepChange={setCreateStep}
              onBusyChange={setIsBusy}
              onCreated={handleCreated}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
