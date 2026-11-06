import { useMemo, useRef, useState } from 'react'
import {
  LuArrowRightLeft,
  LuChevronLeft,
  LuChevronRight,
  LuCreditCard,
  LuLayers,
  LuMonitor,
  LuPlus,
  LuSearch,
  LuSettings2,
  LuUsers,
} from 'react-icons/lu'
import { useAuth } from '../../authetication/auth-context.js'
import Loader from '../../appcomponents/loader.jsx'
import AddDeal from '../components/add-deal.jsx'
import CrmSearchModal from '../components/crm-search-modal.jsx'
import InlineError from '../components/inline-error.jsx'
import KanbanBoard from '../components/kanban-board.jsx'
import ManagePipelineModal from '../components/manage-pipeline-modal.jsx'
import ManageStageDrawer from '../components/manage-stage-drawer.jsx'
import PipelineSelect from '../components/pipeline-select.jsx'
import PipelineTag from '../components/pipeline-tag.jsx'
import SlidingTabs from '../components/sliding-tabs.jsx'
import { scrollBoardByColumns } from '../board-scroll.js'
import useCrmDeals from '../hooks/use-crm-deals.js'
import useCrmPipelines from '../hooks/use-crm-pipelines.js'

const TABS = [
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'actions', label: 'Actions' },
]
const EMPTY_LIST = []

/**
 * Actions tab cards. `scope: 'all'` cards apply to every pipeline and are
 * always shown; `scope: 'pipeline'` cards need a selected pipeline and show
 * its name as a tag.
 */
const ACTIONS = [
  {
    id: 'manage-pipelines',
    scope: 'all',
    title: 'Manage pipeline',
    description: 'Create, edit, or delete pipelines.',
    Icon: LuSettings2,
  },
  {
    id: 'manage-stages',
    scope: 'pipeline',
    title: 'Manage stages',
    description: 'Create, edit, or delete stages in the current pipeline.',
    Icon: LuLayers,
  },
  {
    id: 'assign-users',
    scope: 'pipeline',
    title: 'Assign users',
    description: 'Assign users to deals in the current pipeline.',
    Icon: LuUsers,
  },
  {
    id: 'deal-transfer',
    scope: 'pipeline',
    title: 'Deal transfer',
    description: 'Move or copy deals between pipelines.',
    Icon: LuArrowRightLeft,
  },
  {
    id: 'payment-actions',
    scope: 'pipeline',
    title: 'Payment actions',
    description: 'Enable payment-related actions in the current pipeline.',
    Icon: LuCreditCard,
  },
]

const toolbarButton =
  'box-border flex shrink-0 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e]'

function ActionCard({ action, pipeline, onOpen }) {
  const { title, description, Icon, scope } = action
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen()
    }
  }
  return (
    <article
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen || undefined}
      onKeyDown={onOpen ? handleKeyDown : undefined}
      className={`flex flex-col rounded-lg border p-5 ${onOpen ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}`}
      style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#cc785c]">
          <Icon className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--ew-ink)]">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--ew-muted)]">{description}</p>
        </div>
      </div>
      {scope === 'pipeline' && pipeline ? (
        <div className="mt-auto flex justify-end pt-3">
          <PipelineTag name={pipeline.name} />
        </div>
      ) : null}
    </article>
  )
}

export default function Crm() {
  const { token, user } = useAuth()
  const {
    pipelines,
    isLoading,
    error: loadError,
    reload,
    addPipeline,
    updatePipeline,
    removePipeline,
  } = useCrmPipelines(token)

  const [activeTab, setActiveTab] = useState('pipeline')
  const [selectedPipelineId, setSelectedPipelineId] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [pipelineModalTab, setPipelineModalTab] = useState(null)
  const [isStageDrawerOpen, setIsStageDrawerOpen] = useState(false)
  const [isAddDealOpen, setIsAddDealOpen] = useState(false)
  const boardScrollerRef = useRef(null)

  // Fall back to the first pipeline when nothing (or a deleted pipeline) is selected.
  const selectedPipeline =
    pipelines.find((pipeline) => String(pipeline.id) === selectedPipelineId) ?? pipelines[0] ?? null
  const stages = selectedPipeline?.stages ?? EMPTY_LIST
  const {
    deals,
    isLoading: isLoadingDeals,
    error: dealsError,
    moveError,
    clearMoveError,
    reload: reloadDeals,
    addDeal,
    moveDeal,
  } = useCrmDeals(token, selectedPipeline?.id ?? null)
  const canAddDeal = Boolean(selectedPipeline) && stages.length > 0

  const visibleDeals = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase()
    if (!query) return deals
    return deals.filter(({ client }) =>
      [client?.name, client?.email, client?.phoneNumber].some((value) =>
        String(value || '').toLocaleLowerCase().includes(query),
      ),
    )
  }, [deals, searchQuery])

  const selectPipeline = (id) => {
    setSelectedPipelineId(id)
    setSearchQuery('')
  }

  const scrollBoard = (direction) => scrollBoardByColumns(boardScrollerRef.current, direction)

  const actionHandlers = {
    'manage-pipelines': () => setPipelineModalTab('manage'),
    'manage-stages': () => setIsStageDrawerOpen(true),
  }

  const handlePipelineDeleted = (pipelineId) => {
    removePipeline(pipelineId)
    if (selectedPipeline?.id === pipelineId) {
      setIsStageDrawerOpen(false)
      setSearchQuery('')
    }
  }

  return (
    <>
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 text-center md:hidden">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#cc785c]/10 text-[#b76c4f]">
          <LuMonitor className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-title font-semibold text-[var(--ew-ink)]">Switch to desktop view</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--ew-muted)]">
          The CRM page isn't compatible with mobile view. Please switch your browser to desktop view to continue.
        </p>
      </section>

      <section className="relative hidden min-h-0 flex-1 flex-col gap-4 md:flex">
        <div className="mx-auto flex w-full max-w-6xl shrink-0 flex-wrap items-center justify-between gap-3 md:px-4">
          <SlidingTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} ariaLabel="CRM views" idPrefix="crm" />

          {activeTab === 'pipeline' && (
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search current pipeline"
                className={`${toolbarButton} h-9 min-h-9 w-9`}
              >
                <LuSearch className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsAddDealOpen(true)}
                disabled={!canAddDeal}
                aria-label="Add deal"
                title={canAddDeal ? 'Add deal' : 'Select a pipeline with stages to add deals'}
                className={`${toolbarButton} h-9 min-h-9 w-9 disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <LuPlus className="h-4 w-4" />
              </button>
              {/* Select is a placeholder until bulk deal actions are specified. */}
              <button type="button" className={`${toolbarButton} h-9 min-h-9 px-3 text-sm font-medium`}>
                Select
              </button>

              <PipelineSelect
                pipelines={pipelines}
                value={selectedPipeline ? String(selectedPipeline.id) : ''}
                onChange={selectPipeline}
              />

              <button
                type="button"
                onClick={() => scrollBoard(-1)}
                aria-label="Scroll pipeline left"
                className={`${toolbarButton} h-10 min-h-10 w-10`}
              >
                <LuChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollBoard(1)}
                aria-label="Scroll pipeline right"
                className={`${toolbarButton} h-10 min-h-10 w-10`}
              >
                <LuChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {activeTab === 'pipeline' ? (
          <div id="crm-panel-pipeline" role="tabpanel" aria-labelledby="crm-tab-pipeline" className="flex min-h-0 flex-1 flex-col">
            {isLoading ? (
              <div
                className="flex min-h-[22rem] flex-1 items-center justify-center rounded-control border border-dashed bg-ground/60"
                style={{ borderColor: 'var(--ew-line)' }}
              >
                <Loader size={1.8} />
              </div>
            ) : loadError && pipelines.length === 0 ? (
              <div className="mx-auto w-full max-w-6xl md:px-4">
                <InlineError>
                  {loadError}
                  <button type="button" onClick={reload} className="ml-2 font-medium underline">
                    Retry
                  </button>
                </InlineError>
              </div>
            ) : (
              <>
                {(dealsError || moveError) && (
                  <div className="mx-auto w-full max-w-6xl md:px-4">
                    {dealsError ? (
                      <InlineError>
                        {dealsError}
                        <button type="button" onClick={reloadDeals} className="ml-2 font-medium underline">
                          Retry
                        </button>
                      </InlineError>
                    ) : (
                      <InlineError>
                        {moveError}
                        <button type="button" onClick={clearMoveError} className="ml-2 font-medium underline">
                          Dismiss
                        </button>
                      </InlineError>
                    )}
                  </div>
                )}
                {isLoadingDeals ? (
                  <div
                    className="flex min-h-[22rem] flex-1 items-center justify-center rounded-control border border-dashed bg-ground/60"
                    style={{ borderColor: 'var(--ew-line)' }}
                  >
                    <Loader size={1.8} />
                  </div>
                ) : (
                  <KanbanBoard
                    scrollerRef={boardScrollerRef}
                    stages={stages}
                    deals={visibleDeals}
                    hasPipeline={Boolean(selectedPipeline)}
                    onDealMove={dealsError ? undefined : moveDeal}
                    onCreatePipeline={() => setPipelineModalTab('create')}
                  />
                )}
              </>
            )}
          </div>
        ) : (
          <div
            id="crm-panel-actions"
            role="tabpanel"
            aria-labelledby="crm-tab-actions"
            className="mx-auto grid w-full max-w-6xl flex-1 auto-rows-min grid-cols-1 gap-4 md:px-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {ACTIONS.filter((action) => action.scope === 'all' || selectedPipeline).map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                pipeline={selectedPipeline}
                onOpen={actionHandlers[action.id]}
              />
            ))}
          </div>
        )}

        <CrmSearchModal
          open={searchOpen}
          query={searchQuery}
          onSearch={setSearchQuery}
          onClose={() => setSearchOpen(false)}
        />
        <AddDeal
          open={isAddDealOpen && canAddDeal}
          token={token}
          pipeline={selectedPipeline}
          onClose={() => setIsAddDealOpen(false)}
          onCreated={addDeal}
        />
        <ManageStageDrawer
          open={isStageDrawerOpen && Boolean(selectedPipeline)}
          token={token}
          pipeline={selectedPipeline}
          onClose={() => setIsStageDrawerOpen(false)}
          onStagesChange={(pipelineId, nextStages) => updatePipeline(pipelineId, { stages: nextStages })}
        />
        <ManagePipelineModal
          open={pipelineModalTab !== null}
          initialTab={pipelineModalTab ?? 'manage'}
          token={token}
          user={user}
          pipelines={pipelines}
          isLoading={isLoading}
          loadError={loadError}
          onRetry={reload}
          onClose={() => setPipelineModalTab(null)}
          onCreated={(created) => {
            addPipeline(created)
            selectPipeline(String(created.id))
          }}
          onRenamed={(renamed) => updatePipeline(renamed.id, { name: renamed.name })}
          onDeleted={handlePipelineDeleted}
        />
      </section>
    </>
  )
}
