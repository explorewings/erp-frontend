import { DndContext, KeyboardSensor, PointerSensor, closestCorners, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { LuPlus } from 'react-icons/lu'
import CrmCard from './crm-card.jsx'

const stageDndId = (id) => `stage-${id}`
const dealDndId = (id) => `deal-${id}`

function StageDeals({ stage, deals, onDealMove }) {
  const { setNodeRef, isOver } = useDroppable({
    id: stageDndId(stage.id),
    disabled: !onDealMove,
  })

  return (
    <div
      ref={setNodeRef}
      className={`min-h-0 flex-1 space-y-2 overflow-y-auto rounded-control border p-2 transition-colors ${isOver ? 'border-accent bg-accent-soft/50' : ''}`}
      style={{ borderColor: isOver ? 'var(--ew-accent)' : 'var(--ew-line)', background: isOver ? undefined : 'var(--ew-ground, #f4f3f1)' }}
    >
      <SortableContext items={deals.map((deal) => dealDndId(deal.id))} strategy={verticalListSortingStrategy}>
        {deals.length > 0 ? (
          deals.map((deal) => (
            <CrmCard key={deal.id} deal={deal} draggable={Boolean(onDealMove)} />
          ))
        ) : (
          <div className="flex min-h-40 h-full items-center justify-center rounded-xs border border-dashed px-3 text-center text-xs text-[var(--ew-muted)]" style={{ borderColor: 'var(--ew-line)' }}>
            No deals in this stage
          </div>
        )}
      </SortableContext>
    </div>
  )
}

export default function KanbanBoard({
  scrollerRef,
  stages = [],
  deals = [],
  hasPipeline = false,
  onDealMove,
  onCreatePipeline,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )

  if (!hasPipeline) {
    return (
      <div className="flex min-h-[22rem] flex-1 items-center justify-center rounded-control border border-dashed text-center" style={{ borderColor: 'var(--ew-line)' }}>
        <div className="px-6">
          <button
            type="button"
            aria-label="Create pipeline"
            onClick={onCreatePipeline}
              className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e]"
          >
            <LuPlus className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold text-[var(--ew-ink)]">Create a pipeline</h2>
          <p className="mt-1 text-sm text-[var(--ew-muted)]">Your pipeline board will appear here once you create a pipeline.</p>
        </div>
      </div>
    )
  }

  if (stages.length === 0) {
    return (
      <div className="flex min-h-[22rem] flex-1 items-center justify-center rounded-control border border-dashed text-center" style={{ borderColor: 'var(--ew-line)' }}>
        <p className="px-6 text-sm text-[var(--ew-muted)]">This pipeline has no stages yet.</p>
      </div>
    )
  }

  const handleDragEnd = ({ active, over }) => {
    if (!over || !onDealMove) return
    const dealId = String(active.id).replace(/^deal-/, '')
    const targetId = String(over.id)
    const targetStageId = targetId.startsWith('stage-')
      ? targetId.slice('stage-'.length)
      : deals.find((deal) => dealDndId(deal.id) === targetId)?.stageId
    const sourceDeal = deals.find((deal) => String(deal.id) === dealId)
    const targetStage = stages.find((stage) => String(stage.id) === String(targetStageId))
    if (sourceDeal && targetStage && String(sourceDeal.stageId) !== String(targetStage.id)) {
      onDealMove(sourceDeal.id, targetStage.id)
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-3"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--ew-line) transparent' }}
        aria-label="Pipeline board"
      >
        <div className="flex h-full min-w-max items-stretch gap-3">
          {stages.map((stage) => {
            const stageDeals = deals.filter((deal) => String(deal.stageId) === String(stage.id))
            return (
              <section key={stage.id} className="flex h-full w-[min(20rem,82vw)] shrink-0 flex-col">
                <header className="mb-2 flex shrink-0 items-center justify-between rounded-control border px-3 py-2.5" style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-[var(--ew-ink)]">{stage.name}</h2>
                    <p className="text-xs text-[var(--ew-muted)]">{stageDeals.length} deal{stageDeals.length === 1 ? '' : 's'}</p>
                  </div>
                </header>
                <StageDeals stage={stage} deals={stageDeals} onDealMove={onDealMove} />
              </section>
            )
          })}
        </div>
      </div>
    </DndContext>
  )
}
