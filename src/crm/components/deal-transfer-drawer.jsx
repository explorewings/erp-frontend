import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuArrowRightLeft, LuCheck, LuInfo, LuX } from 'react-icons/lu'
import DrawerBackdrop from '../../appcomponents/drawer-backdrop.jsx'
import Loader from '../../appcomponents/loader.jsx'
import InlineError from './inline-error.jsx'
import PipelineTag from './pipeline-tag.jsx'
import SlidingTabs from './sliding-tabs.jsx'
import { fetchCrmBoard, fetchCrmDealIds, transferCrmDeals } from '../api.js'
import { plural, sortStages } from '../utils.js'

/** The client sends at most this many deal ids per request (one progress step). */
const CHUNK_SIZE = 100

/** Add = copy (`mode: 'copy'`), Move = the source loses the deals. */
const MODE_TABS = [
  { id: 'copy', label: 'Add' },
  { id: 'move', label: 'Move' },
]

const STEPS = ['Select', 'Stages', 'Destination']

/** Shared control styles, matching the other CRM drawers. */
const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ew-accent)]'
const primaryButton = `inline-flex h-9 items-center gap-2 rounded-xs bg-[#cc785c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`
const secondaryButton = `inline-flex h-9 items-center rounded-xs border border-[var(--ew-line)] px-4 text-sm font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground/70 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`

/** Heading + muted lead for each step's panel. */
function StepHeading({ title, children }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-[var(--ew-ink)]">{title}</h3>
      {children ? <p className="mt-1 text-xs leading-relaxed text-[var(--ew-muted)]">{children}</p> : null}
    </div>
  )
}

/** Radio dot used by the single-choice rows (method, target pipeline). */
function RadioDot({ checked }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
        checked ? 'border-[#cc785c]' : 'border-[var(--ew-field-line)]'
      }`}
      aria-hidden="true"
    >
      {checked ? <span className="h-2 w-2 rounded-full bg-[#cc785c]" /> : null}
    </span>
  )
}

/**
 * Labelled steps under the header (same place as the Create pipeline steps).
 * Completed steps show a check; the current one is filled orange.
 */
function TransferSteps({ step, isDone }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Deal transfer steps">
      {STEPS.map((label, index) => {
        const number = index + 1
        const isActive = !isDone && number === step
        const isComplete = isDone || number < step
        return (
          <li key={label} className={`flex items-center gap-2 ${index < STEPS.length - 1 ? 'flex-1' : ''}`}>
            <span
              aria-current={isActive ? 'step' : undefined}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums transition-colors ${
                isActive
                  ? 'border-[#cc785c] bg-[#cc785c] text-white'
                  : isComplete
                    ? 'border-[#cc785c] bg-[var(--ew-surface)] text-[#b76c4f]'
                    : 'border-[var(--ew-line)] bg-[var(--ew-surface)] text-[var(--ew-muted)]'
              }`}
            >
              {isComplete ? <LuCheck className="h-3.5 w-3.5" aria-hidden="true" /> : number}
              <span className="sr-only">{`Step ${number} of ${STEPS.length}${isComplete ? ', done' : ''}`}</span>
            </span>
            <span
              className={`shrink-0 text-xs font-medium ${
                isActive ? 'text-[var(--ew-ink)]' : isComplete ? 'text-[#b76c4f]' : 'text-[var(--ew-muted)]'
              }`}
            >
              {label}
            </span>
            {index < STEPS.length - 1 ? (
              <span
                className={`h-px min-w-4 flex-1 transition-colors ${isComplete ? 'bg-[#cc785c]/50' : 'bg-[var(--ew-line)]'}`}
                aria-hidden="true"
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

const METHOD_OPTIONS = [
  {
    id: 'stage',
    title: 'Select by stage',
    description: 'Pick stages; every deal in them is transferred.',
  },
  {
    id: 'field',
    title: 'Select by fields',
    description: 'Filter deals by their field values.',
    disabled: true,
  },
]

/** ": a, b, c" for skipped clients, shortened when the list is long. */
const summariseSkipped = (items) => {
  const names = items.map((item) => item.clientName).filter(Boolean)
  if (names.length === 0) return ''
  const shown = names.slice(0, 5).join(', ')
  return names.length > 5 ? `: ${shown} and ${names.length - 5} more` : `: ${shown}`
}

/**
 * Deal transfer drawer: pick deals by stage in the current pipeline, then add
 * them to (copy) or move them into another pipeline. Sends chunks of 100 with
 * progress. Owners start unassigned; only a round-robin or single-user target
 * rule re-assigns them (the server decides).
 */
export default function DealTransferDrawer({ token, pipeline, pipelines, onClose, onTransferred }) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(1)
  const [method, setMethod] = useState('stage')
  const [selectedStageIds, setSelectedStageIds] = useState(() => new Set())
  const [mode, setMode] = useState('copy')
  const [targetPipelineId, setTargetPipelineId] = useState('')
  const [targetStageId, setTargetStageId] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const runningRef = useRef(false)
  // Deals per stage come from the server: the board only holds the loaded pages.
  const [stageCounts, setStageCounts] = useState(() => new Map())
  const [countsError, setCountsError] = useState('')

  useEffect(() => {
    if (!pipeline?.id) return undefined
    let cancelled = false
    fetchCrmBoard(token, pipeline.id)
      .then((board) => {
        if (cancelled) return
        setStageCounts(new Map((board?.stages ?? []).map((stage) => [stage.stageId, stage.total ?? 0])))
      })
      .catch((err) => {
        if (!cancelled) setCountsError(err?.message || 'Unable to count the deals in each stage.')
      })
    return () => {
      cancelled = true
    }
  }, [token, pipeline?.id])
  const progressRef = useRef(null)

  // When Add / Move starts, bring the progress bar into view (the target list can be long).
  useEffect(() => {
    if (!isRunning) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    progressRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' })
  }, [isRunning])

  // Slide in on mount; the page only renders this while the drawer is open.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape' && !event.defaultPrevented && !runningRef.current) onClose?.()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const stages = useMemo(() => sortStages(pipeline?.stages), [pipeline])
  const dealsPerStage = stageCounts
  const selectedDealCount = useMemo(
    () => [...selectedStageIds].reduce((sum, stageId) => sum + (dealsPerStage.get(stageId) ?? 0), 0),
    [dealsPerStage, selectedStageIds],
  )
  const targetPipelines = useMemo(
    () => pipelines.filter((item) => item.id !== pipeline?.id && (item.stages?.length ?? 0) > 0),
    [pipelines, pipeline],
  )
  const targetPipeline = targetPipelines.find((item) => String(item.id) === targetPipelineId) ?? null
  const targetStages = useMemo(() => sortStages(targetPipeline?.stages), [targetPipeline])

  if (!pipeline) return null

  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0
  const canContinue =
    step === 1
      ? method === 'stage'
      : step === 2
        ? selectedDealCount > 0
        : Boolean(targetPipeline && targetStageId)

  const toggleStage = (stageId) => {
    setSelectedStageIds((current) => {
      const next = new Set(current)
      if (next.has(stageId)) next.delete(stageId)
      else next.add(stageId)
      return next
    })
  }

  const selectAllStages = () => {
    setSelectedStageIds(
      new Set(
        stages
          .filter((stage) => (dealsPerStage.get(stage.id) ?? 0) > 0)
          .map((stage) => stage.id),
      ),
    )
  }

  /** Selecting a pipeline lands on its first stage until the user picks another. */
  const chooseTargetPipeline = (item) => {
    setTargetPipelineId(String(item.id))
    const [firstStage] = sortStages(item.stages)
    setTargetStageId(firstStage ? String(firstStage.id) : '')
  }

  const submit = async () => {
    if (runningRef.current || !targetPipeline || selectedDealCount === 0) return
    const totals = { transferred: 0, unassigned: 0, missing: 0, skipped: [] }
    setError('')
    setResult(null)
    setProgress({ done: 0, total: selectedDealCount })
    runningRef.current = true
    setIsRunning(true)
    try {
      // Every deal in the chosen stages, not just the cards loaded on the board.
      const { ids = [] } = await fetchCrmDealIds(token, pipeline.id, [...selectedStageIds])
      setProgress({ done: 0, total: ids.length })
      for (let offset = 0; offset < ids.length; offset += CHUNK_SIZE) {
        const chunk = ids.slice(offset, offset + CHUNK_SIZE)
        const response = await transferCrmDeals(token, {
          mode,
          dealIds: chunk,
          targetPipelineId: targetPipeline.id,
          targetStageId: targetStageId ? Number(targetStageId) : undefined,
        })
        totals.transferred += response.counts?.movedCount ?? response.counts?.copiedCount ?? 0
        totals.unassigned += response.unassignedCount ?? 0
        totals.missing += response.missingCount ?? 0
        totals.skipped.push(...(response.skippedDuplicates ?? []))
        setProgress({ done: offset + chunk.length, total: ids.length })
      }
      setResult(totals)
      onTransferred?.()
    } catch (err) {
      setError(err?.message || 'Unable to transfer deals.')
    } finally {
      runningRef.current = false
      setIsRunning(false)
    }
  }

  const close = () => {
    if (!runningRef.current) onClose?.()
  }

  const footerSummary = result
    ? ''
    : step === 1
      ? `${plural(stages.length, 'stage')} in ${pipeline.name}`
      : `${plural(selectedDealCount, 'deal')} selected`

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
          aria-labelledby="deal-transfer-title"
          aria-busy={isRunning}
          className="flex h-full w-full flex-col border-l border-[var(--ew-line)] bg-[var(--ew-surface)] shadow-panel"
        >
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--ew-line)] px-5">
            <div className="flex min-w-0 items-center gap-2">
              <LuArrowRightLeft className="h-4 w-4 shrink-0 text-[var(--ew-ink)]" aria-hidden="true" />
              <h2 id="deal-transfer-title" className="shrink-0 text-sm font-semibold text-[var(--ew-ink)]">
                Deal transfer
              </h2>
              <PipelineTag name={pipeline.name} />
            </div>
            <button
              type="button"
              onClick={close}
              disabled={isRunning}
              aria-label="Close deal transfer"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border border-[var(--ew-line)] text-[var(--ew-muted)] transition-colors hover:bg-ground hover:text-[var(--ew-ink)] disabled:opacity-60 ${focusRing}`}
            >
              <LuX className="h-4 w-4" />
            </button>
          </header>

          <div className="shrink-0 border-b border-[var(--ew-line)] px-5 py-3">
            <TransferSteps step={step} isDone={Boolean(result)} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {result ? (
              <div role="status" className="flex min-h-full flex-col items-center justify-center px-4 py-10 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#cc785c]/10 ring-8 ring-[#cc785c]/5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#cc785c] text-white">
                    <LuCheck className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                </span>
                <h3 className="mt-5 text-title text-[var(--ew-ink)]">
                  {mode === 'copy' ? 'Added' : 'Moved'} {plural(result.transferred, 'deal')}
                </h3>
                <p className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-sm text-[var(--ew-muted)]">
                  {mode === 'copy' ? 'Added to' : 'Now in'}
                  <PipelineTag name={targetPipeline?.name ?? ''} />
                </p>
                {result.skipped.length > 0 || result.unassigned > 0 || result.missing > 0 ? (
                  <ul className="mt-6 w-full max-w-sm space-y-2 rounded-control border border-[var(--ew-line)] px-4 py-3 text-left text-xs leading-relaxed text-[var(--ew-muted)]">
                    {result.unassigned > 0 ? (
                      <li className="flex gap-2">
                        <LuInfo className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ew-muted)]" aria-hidden="true" />
                        <span>
                          {plural(result.unassigned, 'deal')} left unassigned — assign them from Assign users or the deal
                          drawer.
                        </span>
                      </li>
                    ) : null}
                    {result.skipped.length > 0 ? (
                      <li className="flex gap-2">
                        <LuInfo className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ew-muted)]" aria-hidden="true" />
                        <span>
                          {plural(result.skipped.length, 'deal')} skipped — already in the target
                          {summariseSkipped(result.skipped)}.
                        </span>
                      </li>
                    ) : null}
                    {result.missing > 0 ? (
                      <li className="flex gap-2">
                        <LuInfo className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ew-muted)]" aria-hidden="true" />
                        <span>
                          {plural(result.missing, 'deal')} no longer existed and {result.missing === 1 ? 'was' : 'were'}{' '}
                          skipped.
                        </span>
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {!result && step === 1 ? (
              <div>
                <StepHeading title="How to select deals">
                  Choose how deals in <span className="font-medium text-[var(--ew-ink)]">{pipeline.name}</span> are
                  picked for the transfer.
                </StepHeading>
                <div className="space-y-2" role="radiogroup" aria-label="Selection method">
                  {METHOD_OPTIONS.map((option) => {
                    const isSelected = method === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        disabled={option.disabled}
                        onClick={() => setMethod(option.id)}
                        className={`flex w-full items-start gap-3 rounded-control border p-3 text-left transition-colors ${focusRing} ${
                          option.disabled
                            ? 'cursor-not-allowed border-[var(--ew-line)] opacity-60'
                            : isSelected
                              ? 'border-[#cc785c] bg-[#cc785c]/5'
                              : 'border-[var(--ew-line)] hover:border-[#cc785c]/60'
                        }`}
                      >
                        <span className="mt-0.5">
                          <RadioDot checked={isSelected} />
                        </span>
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--ew-ink)]">
                            {option.title}
                            {option.disabled ? (
                              <span className="rounded-pill bg-ground px-2 py-0.5 text-[11px] font-medium text-[var(--ew-muted)]">
                                Coming soon
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block text-xs text-[var(--ew-muted)]">{option.description}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {!result && step === 2 ? (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <StepHeading title="Choose stages">Every deal in the selected stages is transferred.</StepHeading>
                  <div className="flex shrink-0 gap-3 pt-0.5 text-xs font-medium">
                    <button
                      type="button"
                      onClick={selectAllStages}
                      className={`rounded-xs text-[#b76c4f] underline underline-offset-2 hover:text-[#cc785c] ${focusRing}`}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStageIds(new Set())}
                      disabled={selectedStageIds.size === 0}
                      className={`rounded-xs text-[var(--ew-muted)] underline underline-offset-2 hover:text-[var(--ew-ink)] disabled:opacity-50 ${focusRing}`}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                {countsError ? <InlineError className="mb-3">{countsError}</InlineError> : null}
                <ul className="space-y-1.5">
                  {stages.map((stage) => {
                    const count = dealsPerStage.get(stage.id) ?? 0
                    const isSelected = selectedStageIds.has(stage.id)
                    return (
                      <li key={stage.id}>
                        <label
                          className={`flex items-center gap-3 rounded-control border px-3 py-2.5 transition-colors ${
                            count === 0
                              ? 'cursor-not-allowed border-[var(--ew-line)] opacity-50'
                              : isSelected
                                ? 'cursor-pointer border-[#cc785c] bg-[#cc785c]/5'
                                : 'cursor-pointer border-[var(--ew-line)] hover:border-[#cc785c]/60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={count === 0}
                            onChange={() => toggleStage(stage.id)}
                            className="h-4 w-4 shrink-0 accent-[#cc785c]"
                          />
                          <span className="min-w-0 flex-1 truncate text-sm text-[var(--ew-ink)]">{stage.name}</span>
                          <span className="shrink-0 rounded-pill bg-ground px-2 py-0.5 text-xs tabular-nums text-[var(--ew-muted)]">
                            {plural(count, 'deal')}
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}

            {!result && step === 3 ? (
              <div>
                <StepHeading title="Destination">
                  {mode === 'copy'
                    ? `The deals stay in ${pipeline.name} and are also added to the pipeline you pick.`
                    : `The deals leave ${pipeline.name} and move to the pipeline you pick.`}
                </StepHeading>
                <SlidingTabs
                  tabs={MODE_TABS}
                  activeTab={mode}
                  onChange={setMode}
                  ariaLabel="Deal transfer mode"
                  idPrefix="deal-transfer"
                />
                <ul className="mt-4 space-y-1.5" role="radiogroup" aria-label="Target pipeline">
                  {targetPipelines.map((item) => {
                    const isSelected = item.id === targetPipeline?.id
                    return (
                      <li
                        key={item.id}
                        className={`rounded-control border transition-colors ${
                          isSelected ? 'border-[#cc785c] bg-[#cc785c]/5' : 'border-[var(--ew-line)] hover:border-[#cc785c]/60'
                        }`}
                      >
                        <button
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => chooseTargetPipeline(item)}
                          className={`flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left ${focusRing}`}
                        >
                          <RadioDot checked={isSelected} />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--ew-ink)]">
                            {item.name}
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-[var(--ew-muted)]">
                            {plural(item.stages?.length ?? 0, 'stage')}
                          </span>
                        </button>
                        {isSelected ? (
                          <div className="border-t border-[#cc785c]/20 px-3 pb-2.5 pt-2 pl-10">
                            <p id="deal-transfer-stage-label" className="mb-1.5 text-xs font-medium text-[var(--ew-muted)]">
                              Land in stage
                            </p>
                            <ul className="space-y-0.5" role="radiogroup" aria-labelledby="deal-transfer-stage-label">
                              {targetStages.map((stage) => {
                                const isStage = String(stage.id) === targetStageId
                                return (
                                  <li key={stage.id}>
                                    <button
                                      type="button"
                                      role="radio"
                                      aria-checked={isStage}
                                      onClick={() => setTargetStageId(String(stage.id))}
                                      className={`flex w-full items-center gap-2.5 rounded-xs px-2 py-1.5 text-left text-sm transition-colors ${focusRing} ${
                                        isStage
                                          ? 'bg-[var(--ew-surface)] font-medium text-[var(--ew-ink)]'
                                          : 'text-[var(--ew-ink)] hover:bg-[var(--ew-surface)]/70'
                                      }`}
                                    >
                                      <RadioDot checked={isStage} />
                                      <span className="min-w-0 flex-1 truncate">{stage.name}</span>
                                    </button>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                  {targetPipelines.length === 0 ? (
                    <li className="rounded-control border border-dashed border-[var(--ew-line)] px-3 py-5 text-center text-xs text-[var(--ew-muted)]">
                      No other pipeline has stages yet.
                    </li>
                  ) : null}
                </ul>
                <p className="mt-3 text-xs leading-relaxed text-[var(--ew-muted)]">
                  Transferred deals start unassigned unless the target pipeline uses Round robin or Single user.
                </p>
              </div>
            ) : null}

            {!result && (isRunning || error) ? (
              <div ref={progressRef} className="mt-5 scroll-mb-4 border-t border-[var(--ew-line)] pt-4">
                <div className="flex items-center gap-3">
                  <div
                    className="h-2 min-w-0 flex-1 overflow-hidden rounded-pill bg-[#cc785c]/15"
                    role="progressbar"
                    aria-label="Transferring deals"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                  >
                    <div
                      className="h-full rounded-pill bg-[#cc785c] transition-[width] duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-xs font-medium tabular-nums text-[var(--ew-ink)]">{percent}%</span>
                </div>
                <p role="status" className="mt-1.5 text-xs text-[var(--ew-muted)]">
                  {isRunning
                    ? `Transferring ${progress.done} of ${progress.total} deals...`
                    : progress.done > 0
                      ? `Stopped after ${plural(progress.done, 'deal')}.`
                      : 'Nothing was transferred.'}
                </p>
                <InlineError className="mt-2">{error}</InlineError>
              </div>
            ) : null}
          </div>

          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--ew-line)] px-5 py-3">
            <p className="min-w-0 truncate text-xs tabular-nums text-[var(--ew-muted)]">{footerSummary}</p>
            <div className="flex shrink-0 gap-2">
              {result ? (
                <button type="button" onClick={onClose} className={primaryButton}>
                  Done
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => (step === 1 ? close() : setStep(step - 1))}
                    disabled={isRunning}
                    className={secondaryButton}
                  >
                    {step === 1 ? 'Cancel' : 'Back'}
                  </button>
                  {step < 3 ? (
                    <button
                      key="next"
                      type="button"
                      onClick={() => setStep(step + 1)}
                      disabled={!canContinue || isRunning}
                      className={primaryButton}
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      key="submit"
                      type="button"
                      onClick={submit}
                      disabled={!canContinue || isRunning}
                      className={primaryButton}
                    >
                      {isRunning ? <Loader size={0.6} /> : null}
                      {isRunning ? 'Working...' : `${mode === 'copy' ? 'Add' : 'Move'} ${plural(selectedDealCount, 'deal')}`}
                    </button>
                  )}
                </>
              )}
            </div>
          </footer>
        </aside>
      </div>
    </>,
    document.body,
  )
}
