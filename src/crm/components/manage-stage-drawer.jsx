import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LuCheck, LuGripVertical, LuLayers, LuPencil, LuX } from 'react-icons/lu'
import DrawerBackdrop from '../../appcomponents/drawer-backdrop.jsx'
import { renameCrmStage, reorderCrmStages } from '../api.js'

const MAX_STAGE_NAME = 100

const sortStages = (stages) =>
  [...(stages || [])].sort((a, b) => a.position - b.position || a.id - b.id)

const sameOrder = (a, b) => a.length === b.length && a.every((stage, index) => stage.id === b[index].id)

function StageRow({
  stage,
  index,
  isEditing,
  isRenaming,
  dragDisabled,
  editDraft,
  onEditDraftChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage.id, disabled: dragDisabled })

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderColor: isDragging ? '#cc785c' : 'var(--ew-line)',
        background: 'var(--ew-surface)',
      }}
      className={`flex items-center gap-2 rounded-xs border px-2 py-2 ${
        isDragging ? 'relative z-10 shadow-panel' : ''
      }`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        disabled={dragDisabled}
        aria-label={`Reorder ${stage.name}`}
        className="flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded-xs text-[var(--ew-muted)] hover:text-[var(--ew-ink)] active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
      >
        <LuGripVertical className="h-4 w-4" />
      </button>

      <span className="w-5 shrink-0 text-right text-xs tabular-nums text-[var(--ew-muted)]">{index + 1}</span>

      {isEditing ? (
        <input
          type="text"
          value={editDraft}
          maxLength={MAX_STAGE_NAME}
          autoFocus
          disabled={isRenaming}
          aria-label={`New name for ${stage.name}`}
          onChange={(event) => onEditDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onSaveEdit()
            }
            if (event.key === 'Escape') {
              // Cancel the edit without closing the drawer.
              event.preventDefault()
              onCancelEdit()
            }
          }}
          className="h-8 min-w-0 flex-1 rounded-xs border bg-surface px-2 text-sm text-[var(--ew-ink)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
          style={{ borderColor: 'var(--ew-field-line)' }}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm text-[var(--ew-ink)]" title={stage.name}>
          {stage.name}
        </span>
      )}

      <div className="flex shrink-0 items-center gap-1">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={onSaveEdit}
              disabled={isRenaming}
              aria-label="Save stage name"
              className="flex h-7 w-7 items-center justify-center rounded-xs border border-[#cc785c] text-[#cc785c] transition-colors hover:bg-[#cc785c]/10 disabled:opacity-60"
            >
              <LuCheck className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={isRenaming}
              aria-label="Cancel rename"
              className="flex h-7 w-7 items-center justify-center rounded-xs border text-[var(--ew-muted)] transition-colors hover:text-[var(--ew-ink)] disabled:opacity-60"
              style={{ borderColor: 'var(--ew-line)' }}
            >
              <LuX className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onStartEdit}
            aria-label={`Rename ${stage.name}`}
            className="flex h-7 w-7 items-center justify-center rounded-xs text-[var(--ew-muted)] transition-colors hover:text-[#cc785c]"
          >
            <LuPencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </li>
  )
}

/**
 * Drawer for renaming and reordering the stages of one pipeline.
 * - Renames save immediately, one stage at a time.
 * - Reordering is a draft until "Save order"; closing the drawer discards it.
 * `onStagesChange(pipelineId, stages)` receives the saved, ordered stage list.
 */
export default function ManageStageDrawer({ open, token, pipeline, onClose, onStagesChange }) {
  const [visible, setVisible] = useState(false)
  const [order, setOrder] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const onCloseRef = useRef(onClose)
  const ignorePopRef = useRef(false)
  const savedStages = sortStages(pipeline?.stages)
  const pipelineId = pipeline?.id

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
    return undefined
  }, [open])

  // Start from the saved order each time the drawer opens or the pipeline changes.
  // Later stage updates (renames) are merged in place so a draft order survives them.
  useEffect(() => {
    if (!open) return
    setOrder(sortStages(pipeline?.stages))
    setEditingId(null)
    setEditDraft('')
    setError('')
    setNotice('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pipelineId])

  const closeDrawer = () => {
    if (isRenaming || isSavingOrder) return
    ignorePopRef.current = true
    onCloseRef.current?.()
    if (window.history.state?.overlay) {
      window.history.back()
    } else {
      ignorePopRef.current = false
    }
  }

  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape' && !event.defaultPrevented) closeDrawer()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  })

  useEffect(() => {
    if (!open) return undefined
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
  }, [open])

  if (!open || !pipeline) return null

  const isOrderDirty = !sameOrder(order, savedStages)
  const isBusy = isRenaming || isSavingOrder

  const startEdit = (stage) => {
    setEditingId(stage.id)
    setEditDraft(stage.name)
    setError('')
    setNotice('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft('')
  }

  const saveEdit = async () => {
    const stage = order.find((item) => item.id === editingId)
    if (!stage) return
    const name = editDraft.trim()
    if (!name) {
      setError('Stage name is required.')
      return
    }
    if (name === stage.name) {
      cancelEdit()
      return
    }
    const key = name.toLocaleLowerCase()
    if (order.some((item) => item.id !== stage.id && item.name.toLocaleLowerCase() === key)) {
      setError(`A stage named "${name}" already exists in this pipeline.`)
      return
    }

    setIsRenaming(true)
    setError('')
    try {
      const updated = await renameCrmStage(token, pipeline.id, stage.id, name)
      setOrder((current) => current.map((item) => (item.id === updated.id ? { ...item, name: updated.name } : item)))
      onStagesChange?.(
        pipeline.id,
        savedStages.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      )
      cancelEdit()
      setNotice(`Renamed to "${updated.name}".`)
    } catch (err) {
      setError(err?.message || 'Unable to rename stage.')
    } finally {
      setIsRenaming(false)
    }
  }

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    setOrder((current) => {
      const from = current.findIndex((item) => item.id === active.id)
      const to = current.findIndex((item) => item.id === over.id)
      if (from < 0 || to < 0) return current
      return arrayMove(current, from, to)
    })
    setNotice('')
  }

  const saveOrder = async () => {
    setIsSavingOrder(true)
    setError('')
    setNotice('')
    try {
      const saved = await reorderCrmStages(
        token,
        pipeline.id,
        order.map((item) => item.id),
      )
      const next = sortStages(Array.isArray(saved) ? saved : [])
      setOrder(next)
      onStagesChange?.(pipeline.id, next)
      setNotice('Stage order saved.')
    } catch (err) {
      setError(err?.message || 'Unable to save stage order.')
    } finally {
      setIsSavingOrder(false)
    }
  }

  const resetOrder = () => {
    setOrder((current) => {
      const byId = new Map(current.map((item) => [item.id, item]))
      return savedStages.map((item) => byId.get(item.id) ?? item)
    })
    setError('')
    setNotice('')
  }

  return createPortal(
    <>
      <DrawerBackdrop />
      <div
        className={`fixed bottom-0 right-0 top-16 z-50 w-full transition-transform duration-300 ease-out sm:w-[28rem] ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-stages-title"
          className="flex h-full w-full flex-col border-l border-[var(--ew-line)] bg-[var(--ew-surface)] shadow-panel"
        >
          <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[var(--ew-line)] px-4">
            <div className="flex min-w-0 items-center gap-2">
              <LuLayers className="h-4 w-4 shrink-0 text-[var(--ew-ink)]" aria-hidden="true" />
              <h2 id="manage-stages-title" className="shrink-0 text-title text-[var(--ew-ink)]">
                Manage stages
              </h2>
              <span
                title={pipeline.name}
                className="min-w-0 max-w-[10rem] truncate rounded-[2px] bg-[#cc785c]/10 px-2 py-0.5 text-[11px] font-medium text-[#b76c4f]"
              >
                {pipeline.name}
              </span>
            </div>
            <button
              type="button"
              onClick={closeDrawer}
              disabled={isBusy}
              aria-label="Close stage manager"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border border-[var(--ew-line)] text-muted transition-colors hover:text-ink disabled:opacity-60"
            >
              <LuX className="h-4 w-4" />
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            <p className="text-xs text-[var(--ew-muted)]">
              Drag the handle (or focus it and use Space and the arrow keys) to reorder, then save the order.
              Renames are saved immediately.
            </p>

            {order.length === 0 ? (
              <div
                className="flex min-h-32 items-center justify-center rounded-xs border border-dashed text-sm text-[var(--ew-muted)]"
                style={{ borderColor: 'var(--ew-line)' }}
              >
                This pipeline has no stages.
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={order.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                  <ol className="space-y-2">
                    {order.map((stage, index) => (
                      <StageRow
                        key={stage.id}
                        stage={stage}
                        index={index}
                        isEditing={editingId === stage.id}
                        isRenaming={isRenaming && editingId === stage.id}
                        dragDisabled={isBusy || editingId !== null}
                        editDraft={editDraft}
                        onEditDraftChange={setEditDraft}
                        onStartEdit={() => startEdit(stage)}
                        onCancelEdit={cancelEdit}
                        onSaveEdit={saveEdit}
                      />
                    ))}
                  </ol>
                </SortableContext>
              </DndContext>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xs border px-3 py-2 text-body-sm"
                style={{
                  borderColor: 'rgba(194, 65, 12, 0.28)',
                  background: 'rgba(194, 65, 12, 0.06)',
                  color: 'var(--ew-accent-strong)',
                }}
              >
                {error}
              </div>
            )}
            {notice && !error && (
              <p role="status" className="text-xs text-[var(--ew-muted)]">
                {notice}
              </p>
            )}
          </div>

          <footer className="flex items-center justify-between gap-2 border-t border-[var(--ew-line)] p-4">
            <span className="text-xs text-[var(--ew-muted)]">{isOrderDirty ? 'Unsaved order changes' : ''}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetOrder}
                disabled={!isOrderDirty || isBusy}
                className="rounded-xs border px-4 py-2 text-body-sm font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground/70 disabled:opacity-50"
                style={{ borderColor: 'var(--ew-line)' }}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={saveOrder}
                disabled={!isOrderDirty || isBusy || editingId !== null}
                className="rounded-xs bg-[#cc785c] px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60"
              >
                {isSavingOrder ? 'Saving...' : 'Save order'}
              </button>
            </div>
          </footer>
        </aside>
      </div>
    </>,
    document.body,
  )
}
