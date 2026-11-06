import { useEffect, useMemo, useRef, useState } from 'react'
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
import CrmSearchModal from '../components/crm-search-modal.jsx'
import KanbanBoard from '../components/kanban-board.jsx'
import ManagePipelineModal from '../components/managepipelinemodal.jsx'
import ManageStageDrawer from '../components/manage-stage-drawer.jsx'
import PipelineSelect from '../components/pipeline-select.jsx'
import { fetchCrmPipelines } from '../api.js'
import Loader from '../../appcomponents/loader.jsx'

const TABS = [
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'actions', label: 'Actions' },
]
const EMPTY_LIST = []
const PIPELINE_ACTIONS = [
  {
    title: 'Manage pipeline',
    description: 'Create, edit, or delete pipelines.',
    Icon: LuSettings2,
    alwaysAvailable: true,
  },
  {
    title: 'Manage stages',
    description: 'Create, edit, or delete stages in the current pipeline.',
    Icon: LuLayers,
  },
  {
    title: 'Assign users',
    description: 'Assign users to deals in the current pipeline.',
    Icon: LuUsers,
  },
  {
    title: 'Deal transfer',
    description: 'Move or copy deals between pipelines.',
    Icon: LuArrowRightLeft,
  },
  {
    title: 'Payment actions',
    description: 'Enable payment-related actions in the current pipeline.',
    Icon: LuCreditCard,
  },
]

export default function Crm() {
  const [activeTab, setActiveTab] = useState('pipeline')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { token, user } = useAuth()
  const [pipelines, setPipelines] = useState([])
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false)
  const [isStageDrawerOpen, setIsStageDrawerOpen] = useState(false)
  const [isLoadingPipelines, setIsLoadingPipelines] = useState(false)

  useEffect(() => {
    if (!token) return undefined
    let cancelled = false
    setIsLoadingPipelines(true)
    fetchCrmPipelines(token)
      .then((result) => {
        if (cancelled) return
        const list = Array.isArray(result) ? result : result?.items || []
        setPipelines(list)
        if (list.length > 0) {
          setSelectedPipelineId((current) => (current ? current : String(list[0].id)))
        }
      })
      .catch(() => {
        if (!cancelled) setPipelines([])
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPipelines(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])
  const [pipelineModalTab, setPipelineModalTab] = useState('manage')

  const openPipelineModal = (tab = 'manage') => {
    setPipelineModalTab(tab)
    setIsPipelineModalOpen(true)
  }
  const [selectedPipelineId, setSelectedPipelineId] = useState('')
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 })
  const tabRefs = useRef([])
  const boardScrollerRef = useRef(null)

  useEffect(() => {
    const update = () => {
      const index = TABS.findIndex((tab) => tab.id === activeTab)
      const node = tabRefs.current[index]
      if (!node) return
      setSliderStyle({ left: node.offsetLeft, width: node.offsetWidth })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [activeTab])

  const selectedPipeline = pipelines.find((pipeline) => String(pipeline.id) === selectedPipelineId)
  const stages = selectedPipeline?.stages ?? EMPTY_LIST
  const deals = selectedPipeline?.deals ?? EMPTY_LIST

  const visibleDeals = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase()
    if (!query) return deals
    return deals.filter(({ client }) =>
      [client?.name, client?.email, client?.phoneNumber]
        .some((value) => String(value || '').toLocaleLowerCase().includes(query)),
    )
  }, [deals, searchQuery])

  const scrollBoard = (direction) => {
    boardScrollerRef.current?.scrollBy({
      left: direction * Math.max(280, boardScrollerRef.current.clientWidth * 0.75),
      behavior: 'smooth',
    })
  }

  return (
    <>
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 text-center md:hidden">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#cc785c]/10 text-[#b76c4f]">
          <LuMonitor className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-title font-semibold text-[var(--ew-ink)]">
          Switch to desktop view
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--ew-muted)]">
          The CRM page isn't compatible with mobile view. Please switch your browser to desktop view to continue.
        </p>
      </section>

      <section className="relative hidden min-h-0 flex-1 flex-col gap-4 md:flex">
      <div className="mx-auto flex w-full max-w-6xl shrink-0 flex-wrap items-center justify-between gap-3 md:px-4">
        <div
          className="relative inline-flex rounded-lg border p-1"
          role="tablist"
          aria-label="CRM views"
          style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
        >
          <div
            className="absolute inset-y-1 rounded-xs bg-[#cc785c] transition-all duration-300 ease-out"
            style={{ left: sliderStyle.left, width: sliderStyle.width }}
          />
          {TABS.map((tab, index) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                ref={(node) => {
                  tabRefs.current[index] = node
                }}
                id={`crm-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`crm-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`relative z-10 whitespace-nowrap rounded-xs px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-[var(--ew-muted)]'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'pipeline' && (
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search current pipeline"
              className="box-border flex h-9 min-h-9 w-9 shrink-0 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e]"
            >
              <LuSearch className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Add"
              className="box-border flex h-9 min-h-9 w-9 shrink-0 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e]"
            >
              <LuPlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="box-border h-9 min-h-9 shrink-0 rounded-xs bg-[#cc785c] px-3 text-sm font-medium text-white transition-colors hover:bg-[#b36a4e]"
            >
              Select
            </button>

            <PipelineSelect
              pipelines={pipelines}
              value={selectedPipelineId}
              onChange={(id) => {
                setSelectedPipelineId(id)
                setSearchQuery('')
              }}
            />

            <button
              type="button"
              onClick={() => scrollBoard(-1)}
              aria-label="Scroll pipeline left"
              className="box-border flex h-10 min-h-10 w-10 shrink-0 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e]"
            >
              <LuChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBoard(1)}
              aria-label="Scroll pipeline right"
              className="box-border flex h-10 min-h-10 w-10 shrink-0 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e]"
            >
              <LuChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {activeTab === 'pipeline' ? (
        <div
          id="crm-panel-pipeline"
          role="tabpanel"
          aria-labelledby="crm-tab-pipeline"
          className="flex min-h-0 flex-1 flex-col"
        >
          {isLoadingPipelines ? (
            <div className="flex min-h-[22rem] flex-1 items-center justify-center rounded-control border border-dashed bg-ground/60" style={{ borderColor: 'var(--ew-line)' }}>
              <Loader size={1.8} />
            </div>
          ) : (
            <KanbanBoard
              scrollerRef={boardScrollerRef}
              stages={stages}
              deals={visibleDeals}
              hasPipeline={Boolean(selectedPipeline)}
              onCreatePipeline={() => openPipelineModal('create')}
            />
          )}
        </div>
      ) : (
        <div
          id="crm-panel-actions"
          role="tabpanel"
          aria-labelledby="crm-tab-actions"
          className="mx-auto grid w-full max-w-6xl flex-1 auto-rows-min grid-cols-1 gap-4 md:px-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {PIPELINE_ACTIONS
            .filter((action) => action.alwaysAvailable || selectedPipeline)
            .map(({ title, description, Icon }) => {
              const isManagePipeline = title === 'Manage pipeline'
              const onOpen = isManagePipeline
                ? () => openPipelineModal('manage')
                : title === 'Manage stages'
                  ? () => setIsStageDrawerOpen(true)
                  : null
              return (
                <article
                  key={title}
                  role={onOpen ? 'button' : undefined}
                  tabIndex={onOpen ? 0 : undefined}
                  onClick={onOpen || undefined}
                  onKeyDown={
                    onOpen
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            onOpen()
                          }
                        }
                      : undefined
                  }
                  className={`flex flex-col rounded-lg border p-5 ${
                    onOpen ? 'cursor-pointer transition-shadow hover:shadow-md' : ''
                  }`}
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
                  {!isManagePipeline && selectedPipeline ? (
                    <div className="mt-auto flex justify-end pt-3">
                      <span
                        title={selectedPipeline.name}
                        className="max-w-[10rem] truncate rounded-[2px] bg-[#cc785c]/10 px-2 py-0.5 text-[11px] font-medium text-[#b76c4f]"
                      >
                        {selectedPipeline.name}
                      </span>
                    </div>
                  ) : null}
                </article>
              )
            })}
        </div>
      )}

      <CrmSearchModal
        open={searchOpen}
        query={searchQuery}
        onSearch={setSearchQuery}
        onClose={() => setSearchOpen(false)}
      />
      <ManageStageDrawer
        open={isStageDrawerOpen && Boolean(selectedPipeline)}
        token={token}
        pipeline={selectedPipeline}
        onClose={() => setIsStageDrawerOpen(false)}
        onStagesChange={(pipelineId, nextStages) => {
          setPipelines((current) =>
            current.map((pipeline) =>
              pipeline.id === pipelineId ? { ...pipeline, stages: nextStages } : pipeline,
            ),
          )
        }}
      />
      <ManagePipelineModal
        open={isPipelineModalOpen}
        token={token}
        user={user}
        onClose={() => setIsPipelineModalOpen(false)}
        initialTab={pipelineModalTab}
        onRenamed={(renamed) => {
          setPipelines((current) =>
            current.map((pipeline) =>
              pipeline.id === renamed.id ? { ...pipeline, name: renamed.name } : pipeline,
            ),
          )
        }}
        onDeleted={(deletedId) => {
          const remaining = pipelines.filter((pipeline) => pipeline.id !== deletedId)
          setPipelines(remaining)
          if (selectedPipelineId === String(deletedId)) {
            setIsStageDrawerOpen(false)
            setSearchQuery('')
            setSelectedPipelineId(remaining.length > 0 ? String(remaining[0].id) : '')
          }
        }}
        onCreated={(created) => {
          setPipelines((current) => [
            ...current.filter((pipeline) => pipeline.id !== created.id),
            created,
          ])
          if (created?.id) setSelectedPipelineId(String(created.id))
        }}
      />
      </section>
    </>
  )
}
