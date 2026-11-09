import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuSettings2, LuX } from 'react-icons/lu'
import DrawerBackdrop from '../../appcomponents/drawer-backdrop.jsx'
import CreatePipelineWizard, { StepIndicator } from './create-pipeline-wizard.jsx'
import PipelineList from './pipeline-list.jsx'
import SlidingTabs from './sliding-tabs.jsx'

const TABS = [
  { id: 'manage', label: 'Manage' },
  { id: 'create', label: 'Create' },
]

/**
 * Pipeline manager drawer: Manage tab (rename/delete) and Create tab (wizard).
 * Pipelines come from the CRM page; this drawer never fetches its own copy.
 * The drawer mounts fresh on every open, so no state survives a close.
 *
 * Design follows the other CRM drawers (`ManageStageDrawer`, `DealDetailsDrawer`):
 * portal to <body>, DrawerBackdrop scrim, fixed right panel below the topbar
 * (top-16), slide-in via translate-x, Escape + history-overlay close.
 * Width is 32rem (wider than the 26–28rem detail drawers) so the create
 * wizard's template grid and stage editor keep their two-column layout.
 */
export default function ManagePipelineDrawer({ open, ...props }) {
  if (!open) return null
  return <PipelineManagerDrawer {...props} />
}

function PipelineManagerDrawer({
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
  const [visible, setVisible] = useState(false)
  const [activeTab, setActiveTab] = useState(initialTab === 'create' ? 'create' : 'manage')
  const [createStep, setCreateStep] = useState(1)
  const [isBusy, setIsBusy] = useState(false)
  // Bumped after a successful create so the wizard starts over.
  const [wizardKey, setWizardKey] = useState(0)
  const onCloseRef = useRef(onClose)
  const ignorePopRef = useRef(false)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const closeDrawer = () => {
    if (isBusy) return
    ignorePopRef.current = true
    onCloseRef.current?.()
    if (window.history.state?.overlay) {
      window.history.back()
    } else {
      ignorePopRef.current = false
    }
  }

  const closeDrawerRef = useRef(closeDrawer)
  closeDrawerRef.current = closeDrawer

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape' && !event.defaultPrevented) closeDrawerRef.current()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    const onPopState = () => {
      if (ignorePopRef.current) {
        ignorePopRef.current = false
        return
      }
      onCloseRef.current?.()
    }
    window.history.pushState({ overlay: true }, '', window.location.href)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const handleCreated = (created) => {
    onCreated(created)
    setWizardKey((key) => key + 1)
    setCreateStep(1)
    setActiveTab('manage')
  }

  return createPortal(
    <>
      <DrawerBackdrop />
      <div
        className={`fixed bottom-0 right-0 top-16 z-50 w-full transition-transform duration-300 ease-out sm:w-[32rem] ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="pipeline-manager-title"
          className="flex h-full w-full flex-col border-l border-[var(--ew-line)] bg-[var(--ew-surface)] shadow-panel"
        >
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--ew-line)] px-5">
            <div className="flex min-w-0 items-center gap-2">
              <LuSettings2 className="h-4 w-4 shrink-0 text-[var(--ew-ink)]" aria-hidden="true" />
              <div className="min-w-0">
                <h2 id="pipeline-manager-title" className="text-sm font-semibold text-[var(--ew-ink)]">
                  Manage pipelines
                </h2>
                <p className="truncate text-xs text-[var(--ew-muted)]">
                  Create and manage the pipelines used by your CRM board.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeDrawer}
              disabled={isBusy}
              aria-label="Close pipeline manager"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border border-[var(--ew-line)] text-muted transition-colors hover:text-ink disabled:opacity-60"
            >
              <LuX className="h-4 w-4" />
            </button>
          </header>

          <div className="flex items-center justify-between gap-4 border-b border-[var(--ew-line)] px-5 py-3">
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
        </aside>
      </div>
    </>,
    document.body,
  )
}
