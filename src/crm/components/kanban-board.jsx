import { useState } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCorners, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { LuPlus, LuLayers } from 'react-icons/lu'
import CrmCard from './crm-card.jsx'

const stageDndId = (id) => `stage-${id}`
const dealDndId = (id) => `deal-${id}`

function StageDeals({ stage, deals, onDealMove, activeDealId }) {
  const { setNodeRef, isOver } = useDroppable({
    id: stageDndId(stage.id),
    disabled: !onDealMove,
  })

  const isActiveTarget = Boolean(onDealMove && activeDealId)
  const isDropping = Boolean(isOver && onDealMove)

  return (
    <div
      ref={setNodeRef}
      aria-label={`${stage.name} drop zone`}
      className={`min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5 transition-[background-color,border-color,box-shadow] duration-150 ${
        isDropping
          ? 'border-2 border-dashed bg-[#fff5ef]'
          : isActiveTarget
            ? 'border border-dashed bg-[#fff5ef]/70'
            : 'border border-[var(--ew-line)] bg-white'
      }`}
      style={{
        borderColor: isDropping ? 'var(--ew-accent-strong, #b76c4f)' : isActiveTarget ? '#e6c3b2' : 'rgba(255,255,255,0.9)',
        borderRadius: '16px',
        background: isDropping ? 'rgba(255,245,239,0.96)' : isActiveTarget ? 'rgba(255,245,239,0.72)' : 'rgba(255,255,255,0.58)',
        boxShadow: isDropping
          ? 'inset 3px 3px 8px rgba(183,108,79,0.18), inset -3px -3px 8px rgba(255,255,255,0.95), 8px 10px 22px rgba(221,194,178,0.45), -6px -6px 16px rgba(255,255,255,0.95)'
          : 'inset 3px 3px 8px rgba(27,26,24,0.05), inset -3px -3px 8px rgba(255,255,255,0.95), 8px 10px 22px rgba(221,194,178,0.40), -6px -6px 16px rgba(255,255,255,0.95)',
      }}
    >
      <SortableContext items={deals.map((deal) => dealDndId(deal.id))} strategy={verticalListSortingStrategy}>
        {deals.length > 0 ? (
          deals.map((deal) => (
            <CrmCard key={deal.id} deal={deal} draggable={Boolean(onDealMove)} />
          ))
        ) : (
          <div
            className={`flex min-h-40 h-full flex-col items-center justify-center rounded-[6px] px-3 py-6 text-center ${
              isDropping ? 'border border-dashed border-[#b76c4f] bg-white/80' : 'border border-dashed'
            }`}
            style={{ borderColor: isDropping ? undefined : 'var(--ew-line)' }}
          >
            <p className={`text-xs font-medium tracking-wide uppercase ${isDropping ? 'text-[#b76c4f]' : 'text-[var(--ew-muted)]'}`}>
              {isDropping ? 'Release to place deal' : isActiveTarget ? 'Drop deal here' : 'No deals in this stage'}
            </p>
            {!isActiveTarget && !isDropping && (
              <p className="mt-1 max-w-[18ch] text-[11px] leading-5 text-[var(--ew-muted)]">
                Empty columns accept drops.
              </p>
            )}
            {isDropping && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#cc785c] px-2.5 py-1 text-[11px] font-semibold text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                Ready to drop
              </span>
            )}
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
  const [activeDealId, setActiveDealId] = useState(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )

  if (!hasPipeline) {
    return (
      <div className="flex min-h-[22rem] flex-1 items-center justify-center bg-white px-6 py-10">
        <div className="w-full max-w-md border border-[var(--ew-line)] bg-[var(--ew-ground, #f4f3f1)] px-6 py-8 text-center shadow-[0_1px_2px_rgba(27,26,24,0.04),0_14px_34px_-14px_rgba(27,26,24,0.20)]" style={{ borderRadius: '16px' }}>
          <button
            type="button"
            aria-label="Create pipeline"
            onClick={onCreatePipeline}
            className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#cc785c] text-white shadow-[0_8px_20px_-8px_rgba(204,120,92,0.55)] transition hover:bg-[#b36a4e] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#d69375]/40"
          >
            <LuPlus className="h-5 w-5" aria-hidden="true" />
          </button>
          <h2 className="text-[1.125rem] font-semibold leading-[1.4] tracking-[-0.01em] text-[var(--ew-ink)]">Create a pipeline</h2>
          <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-[1.6] text-[var(--ew-muted)]">
            Your pipeline board will appear here once you create a pipeline. Stages you define now become the columns you’ll work in.
          </p>
          <button
            type="button"
            onClick={onCreatePipeline}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#cc785c] px-4 text-sm font-medium text-white transition hover:bg-[#b36a4e] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#d69375]/40"
          >
            <LuPlus className="h-4 w-4" aria-hidden="true" />
            Create pipeline
          </button>
        </div>
      </div>
    )
  }

  if (stages.length === 0) {
    return (
      <div className="flex min-h-[22rem] flex-1 items-center justify-center bg-white px-6 py-10">
        <div className="w-full max-w-md border border-dashed border-[var(--ew-line)] bg-[var(--ew-ground, #f4f3f1)] px-6 py-8 text-center" style={{ borderRadius: '16px' }}>
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-[10px] bg-white text-[var(--ew-ink)] border border-[var(--ew-line)]">
            <LuLayers className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="text-[1.125rem] font-semibold leading-[1.4] tracking-[-0.01em] text-[var(--ew-ink)]">No stages yet</h2>
          <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-[1.6] text-[var(--ew-muted)]">
            This pipeline has no stages. Add stages in Manage pipeline to start tracking deals.
          </p>
        </div>
      </div>
    )
  }

  const handleDragEnd = ({ active, over }) => {
    setActiveDealId(null)
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => setActiveDealId(String(active.id))}
      onDragCancel={() => setActiveDealId(null)}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden bg-transparent"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--ew-line) transparent',
        }}
        aria-label="Pipeline board"
      >
        <div className="flex h-full min-w-max items-stretch gap-5 p-4">
          {stages.map((stage, index) => {
            const stageDeals = deals.filter((deal) => String(deal.stageId) === String(stage.id))
            return (
              <section
                key={stage.id}
                className="group flex h-full w-[min(20rem,82vw)] shrink-0 flex-col bg-transparent last:border-r-0"
                aria-label={`${stage.name} column`}
              >
                <header className="shrink-0 rounded-[10px] border border-[rgba(255,255,255,0.95)] bg-white px-3.5 py-3" style={{ boxShadow: '8px 10px 22px rgba(221,194,178,0.42), -6px -6px 16px rgba(255,255,255,0.95), inset 2px 2px 4px rgba(255,255,255,0.95), inset -2px -2px 4px rgba(247,232,224,0.85)' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[11px] font-semibold tracking-[0.06em] text-[var(--ew-muted)]" style={{ borderRadius: '999px', background: '#f7e8e0', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '3px 3px 8px rgba(221,194,178,0.45), -2px -2px 6px rgba(255,255,255,0.95), inset 2px 2px 4px rgba(255,255,255,0.9)' }}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h2 className="truncate text-sm font-semibold tracking-[-0.01em] text-[var(--ew-ink)]">{stage.name}</h2>
                    </div>
                    <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[#f7e8e0] px-2 text-xs font-semibold tabular-nums text-[var(--ew-ink)]" style={{ border: '1px solid rgba(255,255,255,0.95)', boxShadow: '3px 3px 8px rgba(221,194,178,0.42), -2px -2px 6px rgba(255,255,255,0.95), inset 2px 2px 4px rgba(255,255,255,0.9)' }} aria-label={`${stageDeals.length} deals`}>
                      {stageDeals.length}
                    </span>
                  </div>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: '#eadfd7', boxShadow: 'inset 2px 2px 4px rgba(27,26,24,0.08), inset -2px -2px 4px rgba(255,255,255,0.9)' }}>
                    <div
                      className="h-full bg-[#cc785c]"
                      style={{ width: `${Math.min(100, Math.max(8, stageDeals.length * 18))}%` }}
                      aria-hidden="true"
                    />
                  </div>
                </header>
                <div className="mt-4 flex min-h-0 flex-1 flex-col">
                  <StageDeals stage={stage} deals={stageDeals} onDealMove={onDealMove} activeDealId={activeDealId} />
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </DndContext>
  )
}
