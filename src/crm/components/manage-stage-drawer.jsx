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
import { LuCheck, LuGripVertical, LuLayers, LuPencil, LuPlus, LuTrash, LuX } from 'react-icons/lu'
import DrawerBackdrop from '../../appcomponents/drawer-backdrop.jsx'
import { createCrmStage, deleteCrmStage, renameCrmStage, reorderCrmStages } from '../api.js'
import { hasNameConflict, sortStages } from '../utils.js'
import InlineError from './inline-error.jsx'
import PipelineTag from './pipeline-tag.jsx'

const MAX_STAGE_NAME = 100

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
  onDeleteStage,
  isDeleting,
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
          <>
            <button
              type="button"
              onClick={onStartEdit}
              aria-label={`Rename ${stage.name}`}
              className="flex h-7 w-7 items-center justify-center rounded-xs text-[var(--ew-muted)] transition-colors hover:text-[#cc785c]"
            >
              <LuPencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDeleteStage}
              disabled={isDeleting || dragDisabled}
              aria-label={`Delete ${stage.name}`}
              className="flex h-7 w-7 items-center justify-center rounded-xs text-[var(--ew-muted)] transition-colors hover:text-[#cc785c] disabled:opacity-60"
            >
              <LuTrash className="h-3.5 w-3.5" />
            </button>
          </>
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
  const [isCreatingStage, setIsCreatingStage] = useState(false)
  const [deletingStageId, setDeletingStageId] = useState(null)
  const [newStageName, setNewStageName] = useState('')
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
    setNewStageName('')
    setDeletingStageId(null)
    setError('')
    setNotice('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pipelineId])

  const closeDrawer = () => {
    if (isRenaming || isSavingOrder || isCreatingStage || deletingStageId !== null) return
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
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape' && !event.defaultPrevented) closeDrawerRef.current()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

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
  const isBusy = isRenaming || isSavingOrder || isCreatingStage || deletingStageId !== null

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

  const addStage = async () => {
    const name = newStageName.trim()
    if (!name) {
      setError('Stage name is required.')
      return
    }
    if (hasNameConflict(order.map((item) => item.name), name)) {
      setError(`A stage named "${name}" already exists in this pipeline.`)
      return
    }

    setIsCreatingStage(true)
    setError('')
    setNotice('')
    try {
      const created = await createCrmStage(token, pipeline.id, name)
      const next = sortStages([...order, created])
      setOrder(next)
      setNewStageName('')
      onStagesChange?.(pipeline.id, next)
      setNotice(`Added "${created.name}".`)
    } catch (err) {
      setError(err?.message || 'Unable to add stage.')
    } finally {
      setIsCreatingStage(false)
    }
  }

  const deleteStage = async (stage) => {
    if (order.length <= 1) {
      setError('A pipeline must keep at least one stage.')
      return
    }

    setDeletingStageId(stage.id)
    setError('')
    setNotice('')
    try {
      await deleteCrmStage(token, pipeline.id, stage.id)
      const next = order.filter((item) => item.id !== stage.id)
      setOrder(next)
      onStagesChange?.(pipeline.id, next)
      setNotice(`Deleted "${stage.name}".`)
    } catch (err) {
      setError(err?.message || 'Unable to delete stage.')
    } finally {
      setDeletingStageId(null)
    }
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
    const names = order.map((item) => item.name)
    if (hasNameConflict(names, name, order.indexOf(stage))) {
      setError(`A stage named "${name}" already exists in this pipeline.`)
      return
    }

    setIsRenaming(true)
    setError('')
    try {
      const updated = await renameCrmStage(token, pipeline.id, stage.id, name)
      const next = order.map((item) => (item.id === updated.id ? { ...item, name: updated.name } : item))
      setOrder(next)
      onStagesChange?.(
        pipeline.id,
        next.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
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
              <PipelineTag name={pipeline.name} />
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

            <div className="rounded-xs border p-2" style={{ borderColor: 'var(--ew-line)' }}>
              <label htmlFor="new-stage-name" className="text-xs text-[var(--ew-muted)]">
                Add stage
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="new-stage-name"
                  type="text"
                  value={newStageName}
                  maxLength={MAX_STAGE_NAME}
                  disabled={isBusy}
                  onChange={(event) => setNewStageName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addStage()
                    }
                  }}
                  placeholder="New stage name"
                  className="h-8 min-w-0 flex-1 rounded-xs border bg-surface px-2 text-sm text-[var(--ew-ink)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                  style={{ borderColor: 'var(--ew-field-line)' }}
                />
                <button
                  type="button"
                  onClick={addStage}
                  disabled={isBusy || !newStageName.trim()}
                  aria-label="Add stage"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60"
                >
                  {isCreatingStage ? (
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                  ) : (
                    <LuPlus className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

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
                        onDeleteStage={() => deleteStage(stage)}
                        isDeleting={deletingStageId === stage.id}
                      />
                    ))}
                  </ol>
                </SortableContext>
              </DndContext>
            )}

            <InlineError>{error}</InlineError>
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
