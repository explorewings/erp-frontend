import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { LuPlus, LuLayers } from 'react-icons/lu'
import { stageDndId } from '../utils.js'
import CrmCard, { DealCardOverlay } from './crm-card.jsx'

const DROP_ANIMATION = {
  duration: 200,
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0' } } }),
}
const EMPTY_DEALS = []

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)


/**
 * Keyboard dragging: Left/Right jump to the neighbouring column's centre,
 * Up/Down nudge within the column.
 */
const columnKeyboardCoordinates = (event, { context }) => {
  const { collisionRect, droppableRects, droppableContainers } = context
  if (!collisionRect) return undefined

  if (event.code === 'ArrowRight' || event.code === 'ArrowLeft') {
    event.preventDefault()
    const centerX = collisionRect.left + collisionRect.width / 2
    const columns = droppableContainers
      .getEnabled()
      .map((container) => droppableRects.get(container.id))
      .filter(Boolean)
      .sort((a, b) => a.left - b.left)
    const target =
      event.code === 'ArrowRight'
        ? columns.find((rect) => rect.left > centerX)
        : [...columns].reverse().find((rect) => rect.left + rect.width < centerX)
    if (!target) return undefined
    return { x: target.left + target.width / 2 - collisionRect.width / 2, y: collisionRect.top }
  }

  if (event.code === 'ArrowDown' || event.code === 'ArrowUp') {
    event.preventDefault()
    return { x: collisionRect.left, y: collisionRect.top + (event.code === 'ArrowDown' ? 48 : -48) }
  }
  return undefined
}

/** A column's deal list. It looks the same whether or not a drag is in progress. */
const StageDeals = memo(function StageDeals({ deals, onDealMove, onViewDeal }) {
  return (
    <div
      className="min-h-0 flex-1 space-y-2 overflow-y-auto border p-2.5"
      style={{
        borderColor: 'rgba(255,255,255,0.9)',
        borderRadius: '16px',
        background: 'rgba(255,255,255,0.58)',
        boxShadow:
          'inset 3px 3px 8px rgba(27,26,24,0.05), inset -3px -3px 8px rgba(255,255,255,0.95), 8px 10px 22px rgba(221,194,178,0.40), -6px -6px 16px rgba(255,255,255,0.95)',
      }}
    >
      {deals.length > 0 ? (
        deals.map((deal) => (
          <CrmCard key={deal.id} deal={deal} draggable={Boolean(onDealMove)} onView={onViewDeal} />
        ))
      ) : (
        <div
          className="flex h-full min-h-40 flex-col items-center justify-center rounded-[6px] border border-dashed px-3 py-6 text-center"
          style={{ borderColor: 'var(--ew-line)' }}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--ew-muted)]">No deals in this stage</p>
          <p className="mt-1 max-w-[18ch] text-[11px] leading-5 text-[var(--ew-muted)]">Empty columns accept drops.</p>
        </div>
      )}
    </div>
  )
})

const StageColumn = memo(function StageColumn({ stage, index, deals, onDealMove, onViewDeal }) {
  const { setNodeRef } = useDroppable({ id: stageDndId(stage.id), disabled: !onDealMove })

  return (
    <section
      ref={setNodeRef}
      data-board-column
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
          <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[#f7e8e0] px-2 text-xs font-semibold tabular-nums text-[var(--ew-ink)]" style={{ border: '1px solid rgba(255,255,255,0.95)', boxShadow: '3px 3px 8px rgba(221,194,178,0.42), -2px -2px 6px rgba(255,255,255,0.95), inset 2px 2px 4px rgba(255,255,255,0.9)' }} aria-label={`${deals.length} deals`}>
            {deals.length}
          </span>
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: '#eadfd7', boxShadow: 'inset 2px 2px 4px rgba(27,26,24,0.08), inset -2px -2px 4px rgba(255,255,255,0.9)' }}>
          <div
            className="h-full bg-[#cc785c]"
            style={{ width: `${Math.min(100, Math.max(8, deals.length * 18))}%` }}
            aria-hidden="true"
          />
        </div>
      </header>
      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <StageDeals deals={deals} onDealMove={onDealMove} onViewDeal={onViewDeal} />
</div>
    </section>
  )
})

export default function KanbanBoard({
  scrollerRef,
  stages = [],
  deals = [],
  hasPipeline = false,
  onDealMove,
  onViewDeal,
  onCreatePipeline,
}) {
  const [activeDeal, setActiveDeal] = useState(null)
  const [overStageId, setOverStageId] = useState(null)
  const boardRectRef = useRef(null)

  const stageDeals = useMemo(() => {
    const grouped = new Map(stages.map((stage) => [String(stage.id), []]))
    for (const deal of deals) {
      grouped.get(String(deal.stageId))?.push(deal)
    }
    return grouped
  }, [deals, stages])

  // Pointer over a column wins; gaps between columns resolve to the nearest
  // column instead of retaining a stale drop target.
  const stageCollision = useCallback((args) => {
    if (!args.pointerCoordinates) return closestCenter(args) // keyboard drag
    const hits = pointerWithin(args)
    if (hits.length > 0) return hits
    const boardRect = boardRectRef.current
    const { x, y } = args.pointerCoordinates
    if (!boardRect || x < boardRect.left || x > boardRect.right || y < boardRect.top || y > boardRect.bottom) return []
    let nearestId = null
    let nearestDistance = Infinity
    for (const container of args.droppableContainers) {
      if (container.disabled) continue
      const rect = args.droppableRects.get(container.id)
      if (!rect) continue
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const distance = (x - centerX) ** 2 + (y - centerY) ** 2
      if (distance < nearestDistance) {
        nearestId = container.id
        nearestDistance = distance
      }
    }
    return nearestId === null ? [] : [{ id: nearestId }]
  }, [scrollerRef])
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: columnKeyboardCoordinates }),
  )

  const accessibility = useMemo(() => {
    const stageName = (over) =>
      stages.find((stage) => stageDndId(stage.id) === String(over?.id))?.name ?? 'a stage'
    const dealName = (active) => active?.data.current?.deal?.client?.name ?? 'deal'
    return {
      screenReaderInstructions: {
        draggable:
          'To move a deal, press Space or Enter. Use the left and right arrow keys to choose a stage, then press Space or Enter to drop it, or Escape to cancel.',
      },
      announcements: {
        onDragStart: ({ active }) => `Picked up ${dealName(active)}.`,
        onDragOver: ({ active, over }) =>
          over ? `${dealName(active)} is over ${stageName(over)}.` : `${dealName(active)} is not over a stage.`,
        onDragEnd: ({ active, over }) =>
          over ? `${dealName(active)} dropped in ${stageName(over)}.` : `${dealName(active)} returned to its stage.`,
        onDragCancel: ({ active }) => `Moving ${dealName(active)} was cancelled.`,
      },
    }
  }, [stages])

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

  const resetDrag = () => {
    boardRectRef.current = null
    setActiveDeal(null)
    setOverStageId(null)
  }

  // Animate the card back only when it returns to its own column; a card
  // dropped in another column appears there immediately (optimistic move).
  const movesToOtherStage =
    activeDeal && overStageId !== null && overStageId !== stageDndId(activeDeal.stageId)
  const dropAnimation = prefersReducedMotion() || movesToOtherStage ? null : DROP_ANIMATION

  const handleDragEnd = ({ active, over }) => {
    resetDrag()
    const deal = active.data.current?.deal
    if (!over || !onDealMove || !deal) return
    // Only stage columns are droppable, so `over` is always a column.
    const targetStage = stages.find((stage) => stageDndId(stage.id) === String(over.id))
    if (targetStage && targetStage.id !== deal.stageId) onDealMove(deal.id, targetStage.id)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={stageCollision}
      accessibility={accessibility}
      onDragStart={({ active }) => {
        boardRectRef.current = scrollerRef.current?.getBoundingClientRect() ?? null
        setActiveDeal(active.data.current?.deal ?? null)
      }}
      onDragOver={({ over }) => setOverStageId(over ? String(over.id) : null)}
      onDragCancel={resetDrag}
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
            return (
              <StageColumn
                key={stage.id}
                stage={stage}
                index={index}
                deals={stageDeals.get(String(stage.id)) || EMPTY_DEALS}
                onDealMove={onDealMove}
                onViewDeal={onViewDeal}
              />
            )
          })}
        </div>
      </div>
      {createPortal(
        <DragOverlay dropAnimation={dropAnimation} zIndex={80}>
          {activeDeal ? <DealCardOverlay deal={activeDeal} /> : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  )
}
