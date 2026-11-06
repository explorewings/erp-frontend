import { useRef, useState } from 'react'
import { LuCheck, LuPencil, LuTrash2, LuX } from 'react-icons/lu'
import { deleteCrmPipeline, fetchCrmPipelineDeleteImpact, renameCrmPipeline } from '../api.js'
import { plural } from '../utils.js'
import Loader from '../../appcomponents/loader.jsx'
import InlineError from './inline-error.jsx'

const iconButton =
  'flex h-8 w-8 items-center justify-center rounded-xs transition-colors disabled:opacity-40'

function describeImpact(impact, isLoading) {
  if (isLoading) return 'Checking what this pipeline contains...'
  if (!impact) return 'This pipeline could not be checked, so it cannot be deleted right now.'
  const deals =
    impact.dealCount > 0
      ? ` and ${plural(impact.dealCount, 'deal')}. The clients stay in Clients.`
      : '. It has no deals.'
  return `This permanently deletes the pipeline with its ${plural(impact.stageCount, 'stage')}${deals} This cannot be undone.`
}

/** Collapsible confirmation shown inside a pipeline's card. */
function DeleteConfirmPanel({ id, open, pipelineName, description, error, isDeleting, canConfirm, onCancel, onConfirm }) {
  return (
    <div
      id={id}
      aria-hidden={!open}
      className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
    >
      <div className="min-h-0 overflow-hidden">
        {description ? (
          <div
            role="region"
            aria-label={`Delete ${pipelineName}`}
            className="mt-3 rounded-xs border border-danger/30 bg-danger/5 px-3 py-3"
          >
            <p className="text-sm font-semibold text-danger">Delete this pipeline?</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--ew-muted)]">{description}</p>
            {error && (
              <p role="alert" className="mt-2 text-xs font-medium text-danger">
                {error}
              </p>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={!open || isDeleting}
                className="rounded-xs border bg-surface px-3 py-1.5 text-xs font-medium text-[var(--ew-muted)] transition-colors hover:text-[var(--ew-ink)] disabled:opacity-60"
                style={{ borderColor: 'var(--ew-line)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={!open || !canConfirm || isDeleting}
                className="rounded-xs bg-danger px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-danger-strong disabled:opacity-60"
              >
                {isDeleting ? 'Deleting...' : 'Delete pipeline'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Manage tab of the pipeline modal: lists pipelines with inline rename and an
 * in-card delete confirmation. Edit/delete icons appear only when the server
 * says the user may manage the pipeline (`canManage`).
 */
export default function PipelineList({ token, pipelines, isLoading, error, onRetry, onRenamed, onDeleted }) {
  const [renamingId, setRenamingId] = useState(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [isSavingRename, setIsSavingRename] = useState(false)
  const [renameError, setRenameError] = useState('')

  // deleteTargetId opens the panel; panelId keeps its content while it collapses.
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [panelId, setPanelId] = useState(null)
  const [impact, setImpact] = useState(null)
  const [isLoadingImpact, setIsLoadingImpact] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const impactRequestRef = useRef(0)

  if (isLoading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Loader size={1.8} />
      </div>
    )
  }

  if (error) {
    return (
      <InlineError>
        {error}
        <button type="button" onClick={onRetry} className="ml-2 font-medium underline">
          Retry
        </button>
      </InlineError>
    )
  }

  if (pipelines.length === 0) {
    return (
      <div
        className="flex min-h-40 flex-col items-center justify-center rounded-control border border-dashed text-center"
        style={{ borderColor: 'var(--ew-line)' }}
      >
        <p className="text-sm font-semibold text-[var(--ew-ink)]">No pipelines yet</p>
        <p className="mt-1 text-xs text-[var(--ew-muted)]">Switch to Create to make your first pipeline.</p>
      </div>
    )
  }

  const startRename = (pipeline) => {
    setRenamingId(pipeline.id)
    setRenameDraft(pipeline.name)
    setRenameError('')
  }

  const cancelRename = () => {
    setRenamingId(null)
    setRenameDraft('')
  }

  const saveRename = async (pipeline) => {
    const name = renameDraft.trim()
    if (!name) {
      setRenameError('Pipeline name is required.')
      return
    }
    if (name === pipeline.name) {
      cancelRename()
      return
    }
    setIsSavingRename(true)
    setRenameError('')
    try {
      const updated = await renameCrmPipeline(token, pipeline.id, name)
      onRenamed(updated)
      cancelRename()
    } catch (err) {
      setRenameError(err?.message || 'Unable to rename pipeline.')
    } finally {
      setIsSavingRename(false)
    }
  }

  const closeDelete = () => {
    if (isDeleting) return
    setDeleteTargetId(null)
    setDeleteError('')
  }

  const toggleDelete = async (pipeline) => {
    if (deleteTargetId === pipeline.id) {
      closeDelete()
      return
    }
    setDeleteTargetId(pipeline.id)
    setPanelId(pipeline.id)
    setImpact(null)
    setDeleteError('')
    setIsLoadingImpact(true)
    // Ignore a slow response for a pipeline that is no longer the one being confirmed.
    const requestId = ++impactRequestRef.current
    try {
      const result = await fetchCrmPipelineDeleteImpact(token, pipeline.id)
      if (requestId === impactRequestRef.current) setImpact(result)
    } catch (err) {
      if (requestId === impactRequestRef.current) {
        setDeleteError(err?.message || 'Unable to load what will be deleted.')
      }
    } finally {
      if (requestId === impactRequestRef.current) setIsLoadingImpact(false)
    }
  }

  const confirmDelete = async (pipeline) => {
    setIsDeleting(true)
    setDeleteError('')
    try {
      await deleteCrmPipeline(token, pipeline.id)
      setDeleteTargetId(null)
      setPanelId(null)
      setImpact(null)
      onDeleted(pipeline.id)
    } catch (err) {
      setDeleteError(err?.message || 'Unable to delete pipeline.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      <ul className="min-h-40 space-y-2">
        {pipelines.map((pipeline) => {
          const isRenaming = renamingId === pipeline.id
          const isDeleteOpen = deleteTargetId === pipeline.id
          const stageCount = pipeline.stages?.length ?? 0
          return (
            <li
              key={pipeline.id}
              className="rounded-control border px-3 py-3 transition-colors"
              style={{
                borderColor: isDeleteOpen ? 'rgba(220, 38, 38, 0.35)' : 'var(--ew-line)',
                background: 'var(--ew-surface)',
              }}
            >
              <div className={`flex justify-between ${isRenaming ? 'items-start' : 'items-center'}`}>
                <div className="min-w-0 flex-1">
                  {isRenaming ? (
                    <input
                      type="text"
                      value={renameDraft}
                      maxLength={100}
                      autoFocus
                      disabled={isSavingRename}
                      aria-label={`New name for ${pipeline.name}`}
                      onChange={(event) => setRenameDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          saveRename(pipeline)
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault()
                          cancelRename()
                        }
                      }}
                      className="h-8 w-full rounded-xs border bg-surface px-2 text-sm text-[var(--ew-ink)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                      style={{ borderColor: 'var(--ew-field-line)' }}
                    />
                  ) : (
                    <h3 className="truncate text-sm font-semibold text-[var(--ew-ink)]" title={pipeline.name}>
                      {pipeline.name}
                    </h3>
                  )}
                  <p className="text-xs text-[var(--ew-muted)]">{plural(stageCount, 'stage')}</p>
                </div>

                {pipeline.canManage ? (
                  <div className="ml-3 flex shrink-0 items-center gap-1">
                    {isRenaming ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveRename(pipeline)}
                          disabled={isSavingRename}
                          aria-label="Save pipeline name"
                          className={`${iconButton} border border-[#cc785c] text-[#cc785c] hover:bg-[#cc785c]/10`}
                        >
                          <LuCheck className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelRename}
                          disabled={isSavingRename}
                          aria-label="Cancel rename"
                          className={`${iconButton} border text-[var(--ew-muted)] hover:text-[var(--ew-ink)]`}
                          style={{ borderColor: 'var(--ew-line)' }}
                        >
                          <LuX className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startRename(pipeline)}
                          disabled={renamingId !== null || deleteTargetId !== null}
                          aria-label={`Rename ${pipeline.name}`}
                          className={`${iconButton} text-[var(--ew-muted)] hover:bg-ground/70 hover:text-[#cc785c]`}
                        >
                          <LuPencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleDelete(pipeline)}
                          disabled={renamingId !== null || isDeleting}
                          aria-label={`Delete ${pipeline.name}`}
                          aria-expanded={isDeleteOpen}
                          aria-controls={`pipeline-delete-${pipeline.id}`}
                          className={`${iconButton} hover:bg-ground/70 hover:text-danger ${
                            isDeleteOpen ? 'bg-danger/10 text-danger' : 'text-[var(--ew-muted)]'
                          }`}
                        >
                          <LuTrash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              </div>

              {pipeline.canManage ? (
                <DeleteConfirmPanel
                  id={`pipeline-delete-${pipeline.id}`}
                  open={isDeleteOpen}
                  pipelineName={pipeline.name}
                  description={panelId === pipeline.id ? describeImpact(impact, isLoadingImpact) : ''}
                  error={isDeleteOpen ? deleteError : ''}
                  isDeleting={isDeleting}
                  canConfirm={Boolean(impact) && !isLoadingImpact}
                  onCancel={closeDelete}
                  onConfirm={() => confirmDelete(pipeline)}
                />
              ) : null}
            </li>
          )
        })}
      </ul>
      <InlineError className="mt-3">{renameError}</InlineError>
    </div>
  )
}
