import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuCheck, LuX } from 'react-icons/lu'
import { addExistingCrmDeals, fetchCrmPipelines } from '../../crm/api.js'
import { fetchClients } from '../api.js'

const BATCH_SIZE = 100

export default function ClientToPipeline({
  open,
  token,
  clientIds = [],
  imports = [],
  selectedCount,
  onClose,
  onCompleted,
}) {
  const [pipelines, setPipelines] = useState([])
  const [pipelineId, setPipelineId] = useState('')
  const [isLoadingPipelines, setIsLoadingPipelines] = useState(true)
  const [isMoving, setIsMoving] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState({ done: 0, total: selectedCount, added: 0, skipped: 0, missing: 0 })
  const [clientIdsToMove, setClientIdsToMove] = useState(null)

  const selectedPipeline = useMemo(
    () => pipelines.find((pipeline) => String(pipeline.id) === pipelineId),
    [pipelines, pipelineId],
  )

  useEffect(() => {
    if (!open || !token) return undefined

    let cancelled = false
    fetchCrmPipelines(token)
      .then((list) => {
        if (!cancelled) setPipelines(Array.isArray(list) ? list : [])
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError?.message || 'Unable to load pipelines.')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPipelines(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, token])

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isMoving) onClose?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, isMoving, onClose])

  if (!open) return null

  const resolveClientIds = async () => {
    const ids = new Set(clientIds)
    for (const clientImport of imports) {
      const result = await fetchClients(token, {
        page: 1,
        limit: BATCH_SIZE,
        importId: clientImport.id,
      })
      const totalPages = Math.max(1, Number(result?.totalPages) || 1)
      for (const client of result?.items ?? []) ids.add(client.id)
      for (let page = 2; page <= totalPages; page += 1) {
        const nextPage = await fetchClients(token, {
          page,
          limit: BATCH_SIZE,
          importId: clientImport.id,
        })
        for (const client of nextPage?.items ?? []) ids.add(client.id)
      }
    }
    return [...ids]
  }

  const startMoving = async (event) => {
    event.preventDefault()
    if (isMoving || !selectedPipeline || !token) return

    setIsMoving(true)
    setError('')
    try {
      const ids = clientIdsToMove ?? await resolveClientIds()
      if (ids.length === 0) throw new Error('No selected clients were found.')
      if (clientIdsToMove === null) {
        setClientIdsToMove(ids)
        setProgress({ done: 0, total: ids.length, added: 0, skipped: 0, missing: 0 })
      }

      let done = clientIdsToMove === null ? 0 : progress.done
      let added = clientIdsToMove === null ? 0 : progress.added
      let skipped = clientIdsToMove === null ? 0 : progress.skipped
      let missing = clientIdsToMove === null ? 0 : progress.missing

      for (let offset = done; offset < ids.length; offset += BATCH_SIZE) {
        const batch = ids.slice(offset, offset + BATCH_SIZE)
        const result = await addExistingCrmDeals(token, selectedPipeline.id, batch)
        const addedInBatch = Number(result?.addedCount)
        const skippedInBatch = Number(result?.alreadyInPipelineCount)
        const missingInBatch = Number(result?.missingCount)
        if (
          !Number.isInteger(addedInBatch) ||
          addedInBatch < 0 ||
          !Number.isInteger(skippedInBatch) ||
          skippedInBatch < 0 ||
          !Number.isInteger(missingInBatch) ||
          missingInBatch < 0 ||
          addedInBatch + skippedInBatch + missingInBatch !== batch.length
        ) {
          throw new Error('The server returned invalid client transfer progress.')
        }

        done += batch.length
        added += addedInBatch
        skipped += skippedInBatch
        missing += missingInBatch
        setProgress({ done, total: ids.length, added, skipped, missing })
      }

      onCompleted?.({ added, skipped, missing, pipelineName: selectedPipeline.name })
    } catch (moveError) {
      setError(moveError?.message || 'Unable to add selected clients to the pipeline.')
    } finally {
      setIsMoving(false)
    }
  }

  const percentage = progress.total > 0
    ? Math.min(100, Math.round((progress.done / progress.total) * 100))
    : 0

  return createPortal(
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center overflow-y-auto bg-ink/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isMoving) onClose?.()
      }}
    >
      <section
        className="my-auto w-full max-w-lg overflow-hidden rounded-control border shadow-2xl"
        style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-to-pipeline-title"
      >
        <header className="flex items-start justify-between gap-4 border-b px-6 py-4" style={{ borderColor: 'var(--ew-line)' }}>
          <div>
            <h2 id="client-to-pipeline-title" className="text-title text-[var(--ew-ink)]">
              Add clients to CRM
            </h2>
            <p className="mt-1 text-xs text-[var(--ew-muted)]">
              {selectedCount} selected. Clients stay in the Clients list; clients already in the chosen pipeline will be skipped.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isMoving}
            aria-label="Close Add clients to CRM"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border text-muted hover:bg-ground hover:text-ink disabled:opacity-50"
            style={{ borderColor: 'var(--ew-line)' }}
          >
            <LuX className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={(event) => void startMoving(event)}>
          <div className="space-y-3 px-6 py-5">
            <fieldset disabled={isMoving || (clientIdsToMove !== null && progress.done > 0)}>
              <legend className="mb-2 text-xs font-medium text-[var(--ew-muted)]">
                Choose a pipeline
              </legend>
              {isLoadingPipelines ? (
                <p className="py-4 text-center text-sm text-[var(--ew-muted)]" role="status">
                  Loading pipelines...
                </p>
              ) : null}
              {!isLoadingPipelines && pipelines.length > 0 ? (
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {pipelines.map((pipeline) => {
                    const selected = String(pipeline.id) === pipelineId
                    const hasStages = Boolean(pipeline.stages?.length)
                    return (
                      <button
                        key={pipeline.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={!hasStages}
                        onClick={() => setPipelineId(String(pipeline.id))}
                        className={`flex w-full items-center gap-3 rounded-xs border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-55 ${
                          selected
                            ? 'border-[#cc785c] bg-[#cc785c]/[0.06]'
                            : 'border-line bg-surface hover:border-[#cc785c]/60 hover:bg-ground/50'
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? 'border-[#cc785c] bg-[#cc785c] text-white'
                              : 'border-line text-transparent'
                          }`}
                          aria-hidden="true"
                        >
                          {selected ? <LuCheck className="h-3.5 w-3.5" /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-sm font-medium ${selected ? 'text-[#b76c4f]' : 'text-[var(--ew-ink)]'}`}>
                            {pipeline.name}
                          </span>
                          <span className="mt-1 block text-xs text-[var(--ew-muted)]">
                            {Number(pipeline.dealCount) || 0} deals
                            {' · '}
                            {hasStages
                              ? `${pipeline.stages.length} ${pipeline.stages.length === 1 ? 'stage' : 'stages'}`
                              : 'No stages available'}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </fieldset>
            {!isLoadingPipelines && pipelines.length === 0 && !error ? (
              <p className="text-sm text-[var(--ew-muted)]">No pipelines are available to you.</p>
            ) : null}
            {error ? (
              <p role="alert" className="rounded-xs border px-3 py-2 text-sm text-[var(--ew-accent-strong)]" style={{ borderColor: 'rgba(194,65,12,.28)', background: 'rgba(194,65,12,.06)' }}>
                {error}
              </p>
            ) : null}
          </div>

          <footer className="space-y-4 border-t px-6 py-4" style={{ borderColor: 'var(--ew-line)' }}>
            {isMoving ? (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-[var(--ew-muted)]">
                  <span>{clientIdsToMove === null ? 'Preparing selected clients...' : `Adding clients: ${progress.done} of ${progress.total}`}</span>
                  <span>{percentage}%</span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-pill bg-ground"
                  role="progressbar"
                  aria-label="Clients added to pipeline"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percentage}
                >
                  <div className="h-full rounded-pill bg-[#cc785c] transition-[width] duration-300" style={{ width: `${percentage}%` }} />
                </div>
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isMoving}
                className="rounded-xs border px-4 py-2 text-body-sm font-medium text-[var(--ew-ink)] hover:bg-ground/70 disabled:opacity-50"
                style={{ borderColor: 'var(--ew-line)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isMoving || isLoadingPipelines || !selectedPipeline}
                className="rounded-xs bg-[#cc785c] px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60"
              >
                {isMoving ? 'Moving...' : clientIdsToMove && progress.done > 0 ? 'Retry move' : 'Move to CRM'}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  )
}
