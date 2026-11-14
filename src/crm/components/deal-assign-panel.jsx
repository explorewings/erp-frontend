import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LuChevronDown,
  LuHand,
  LuUserPlus,
} from 'react-icons/lu'
import Alert from '../../appcomponents/alert.jsx'
import Loader from '../../appcomponents/loader.jsx'
import {
  distributeCrmUnassignedDeals,
  fetchCrmAssignmentOverview,
  saveCrmAssignmentRule,
  unassignCrmDealsBySource,
} from '../api.js'
import InlineError from './inline-error.jsx'
import { plural } from '../utils.js'

const RULE_LABELS = {
  round_robin: 'Round robin',
  single_user: 'Single user',
  creator: 'Creator',
  manual: 'Manual',
}

/** Rules that assign existing deals in bulk; only one may own deals at a time. */
const BULK_SOURCES = ['round_robin', 'single_user']

const CARDS = [
  {
    id: 'round_robin',
    methods: ['round_robin'],
    title: 'Round robin',
    description: 'Share deals equally, giving each one to the next user in turn.',
  },
  {
    id: 'creator_manual',
    methods: ['creator', 'manual'],
    title: 'Creator + manual',
    description: 'Give deals to the person who adds them, or assign every deal by hand.',
  },
  {
    id: 'single_user',
    methods: ['single_user'],
    title: 'Single user',
    description: 'Give every deal to one user you choose.',
  },
]

/**
 * Deal assign tab: the pipeline's assignment rule. Round robin and single user
 * can also assign the existing unassigned deals, in chunks, with progress.
 * Only super roles can change anything (`canEdit`).
 */
export default function DealAssignPanel({
  token,
  pipelineId,
  canEdit,
  isActive,
  refreshKey,
  onRuleChange,
  onDealsChange,
  onBusyChange,
}) {
  const [overview, setOverview] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadTick, setReloadTick] = useState(0)
  const [expanded, setExpanded] = useState(null)
  const [savingMethod, setSavingMethod] = useState(null)
  const [run, setRun] = useState(null) // { method, total, done, status, message }
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  // Unassign confirmation: { source, userId, username, isReceiver, total, done, status: 'confirm' | 'running', error }
  const [unassign, setUnassign] = useState(null)

  const mountedRef = useRef(true)
  const onRuleChangeRef = useRef(onRuleChange)
  const onDealsChangeRef = useRef(onDealsChange)
  useEffect(() => {
    onRuleChangeRef.current = onRuleChange
    onDealsChangeRef.current = onDealsChange
  })
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const isBusy = Boolean(savingMethod) || run?.status === 'running' || unassign?.status === 'running'

  // Lets the drawer refuse to close while an action is running.
  const onBusyChangeRef = useRef(onBusyChange)
  useEffect(() => {
    onBusyChangeRef.current = onBusyChange
  })
  useEffect(() => {
    onBusyChangeRef.current?.(isBusy)
  }, [isBusy])
  useEffect(() => () => onBusyChangeRef.current?.(false), [])

  useEffect(() => {
    if (!isActive) return undefined
    let cancelled = false
    setIsLoading(true)
    setLoadError('')
    fetchCrmAssignmentOverview(token, pipelineId)
      .then((data) => {
        if (cancelled) return
        setOverview(data)
        setExpanded((current) => current ?? CARDS.find((card) => card.methods.includes(data.method))?.id ?? null)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || 'Unable to load deal assignment.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, pipelineId, isActive, refreshKey, reloadTick])

  const applyOverview = useCallback((data) => {
    if (!mountedRef.current) return
    setOverview(data)
    // A saved rule becomes the selected card.
    setExpanded(CARDS.find((card) => card.methods.includes(data.method))?.id ?? null)
    onRuleChangeRef.current?.(data.method)
  }, [])

  const saveRule = async (method, userId) => {
    const unchanged =
      overview?.method === method && (method !== 'single_user' || overview.singleUserId === userId)
    if (isBusy || unchanged) return overview
    setSavingMethod(method)
    setActionError('')
    setNotice('')
    try {
      const data = await saveCrmAssignmentRule(token, pipelineId, method, userId)
      applyOverview(data)
      return data
    } finally {
      if (mountedRef.current) setSavingMethod(null)
    }
  }

  const handleSelectRule = async (method) => {
    try {
      await saveRule(method)
      if (mountedRef.current) setNotice(`${RULE_LABELS[method]} saved. New deals follow this rule.`)
    } catch (err) {
      if (mountedRef.current) setActionError(err?.message || 'Unable to save the assignment rule.')
    }
  }

  /** Single user ①: saves who gets new deals. Resolves true when saved. */
  const handleSaveTarget = async (userId) => {
    try {
      const data = await saveRule('single_user', userId)
      if (mountedRef.current) {
        setNotice(`Saved. Every new deal now goes to ${data?.singleUsername ?? 'the chosen user'}.`)
      }
      return true
    } catch (err) {
      if (mountedRef.current) setActionError(err?.message || 'Unable to save the assignment rule.')
      return false
    }
  }

  /** Saves the rule (if needed), then assigns unassigned deals chunk by chunk. */
  const handleAssign = async (method, userId) => {
    if (isBusy || !overview) return
    setActionError('')
    setNotice('')
    let saved
    try {
      saved = await saveRule(method, userId)
    } catch (err) {
      if (mountedRef.current) setActionError(err?.message || 'Unable to save the assignment rule.')
      return
    }
    const total = saved?.unassigned ?? 0
    if (total === 0) {
      setNotice(
        method === 'single_user'
          ? `Saved. All new deals will be assigned to ${saved?.singleUsername ?? 'the chosen user'}.`
          : `${RULE_LABELS[method]} saved. New deals follow this rule.`,
      )
      return
    }

    let done = 0
    setRun({ method, total, done, status: 'running', message: '' })
    try {
      // Each call assigns up to one chunk; loop until nothing is left.
      for (;;) {
        if (!mountedRef.current) return
        const result = await distributeCrmUnassignedDeals(token, pipelineId)
        done += result.assignedCount
        if (mountedRef.current) {
          setRun({ method, total, done: Math.min(done, total), status: 'running', message: '' })
        }
        if (result.remaining === 0) break
        if (result.assignedCount === 0) {
          throw new Error(
            method === 'single_user'
              ? `${saved?.singleUsername ?? 'The chosen user'} can no longer receive deals. Choose someone else.`
              : `${plural(result.remaining, 'deal')} could not be assigned because no eligible user is available.`,
          )
        }
      }
      if (mountedRef.current) {
        setRun({ method, total, done, status: 'done', message: `Assigned ${plural(done, 'deal')}.` })
      }
    } catch (err) {
      if (mountedRef.current) {
        setRun({ method, total, done, status: 'error', message: '' })
        setActionError(err?.message || 'Unable to assign deals.')
      }
    } finally {
      onDealsChangeRef.current?.()
      if (mountedRef.current) setReloadTick((tick) => tick + 1)
    }
  }

  /** Opens the confirmation for all of `source`'s deals, or only `owner`'s. */
  const openUnassign = (source, owner) => {
    const total = owner ? owner.dealCount : (overview?.assignedBySource?.[source] ?? 0)
    if (isBusy || total === 0) return
    setActionError('')
    setNotice('')
    setUnassign({
      source,
      userId: owner?.userId ?? null,
      username: owner?.username ?? null,
      isReceiver:
        Boolean(owner) && overview?.method === 'single_user' && overview.singleUserId === owner.userId,
      total,
      done: 0,
      status: 'confirm',
      error: '',
    })
  }

  /** Unassigns every deal assigned by `source`, chunk by chunk, with progress in the alert. */
  const confirmUnassign = async () => {
    if (!unassign || unassign.status === 'running') return
    const { source, userId, username, total } = unassign
    let done = 0
    setUnassign({ ...unassign, done, status: 'running', error: '' })
    try {
      for (;;) {
        if (!mountedRef.current) return
        const result = await unassignCrmDealsBySource(token, pipelineId, source, userId)
        done += result.unassignedCount
        if (mountedRef.current) {
          setUnassign((current) => current && { ...current, total: Math.max(total, done), done })
        }
        if (result.remaining === 0 || result.unassignedCount === 0) break
      }
      if (mountedRef.current) {
        setUnassign(null)
        setNotice(
          username
            ? `Unassigned ${plural(done, 'deal')} from ${username}.`
            : `Reverted ${RULE_LABELS[source].toLowerCase()}: ${plural(done, 'deal')} unassigned.`,
        )
      }
    } catch (err) {
      if (mountedRef.current) {
        setUnassign((current) =>
          current && { ...current, done, status: 'confirm', error: err?.message || 'Unable to unassign deals.' },
        )
      }
    } finally {
      onDealsChangeRef.current?.()
      if (mountedRef.current) setReloadTick((tick) => tick + 1)
    }
  }

  if (isLoading && !overview) {
    return (
      <p role="status" className="py-6 text-center text-sm text-[var(--ew-muted)]">
        Loading deal assignment...
      </p>
    )
  }
  if (loadError && !overview) {
    return (
      <InlineError>
        {loadError}
        <button type="button" onClick={() => setReloadTick((tick) => tick + 1)} className="ml-2 font-medium underline">
          Retry
        </button>
      </InlineError>
    )
  }
  if (!overview) return null

  const { method, total, assigned, unassigned, users, singleUserId, singleUsername, singleUserEligible } = overview
  const roundRobinAssigned = overview.assignedBySource?.round_robin ?? 0
  const isSingleActive = method === 'single_user'
  const activeCardId = CARDS.find((card) => card.methods.includes(method))?.id ?? CARDS[0].id
  // One bulk rule at a time: a card is locked while another bulk rule still owns deals.
  const lockOf = (card) => {
    const source = BULK_SOURCES.find(
      (candidate) => !card.methods.includes(candidate) && (overview.assignedBySource?.[candidate] ?? 0) > 0,
    )
    return source ? { source, count: overview.assignedBySource[source] } : null
  }
  const selectedCardId =
    expanded && !lockOf(CARDS.find((card) => card.id === expanded) ?? CARDS[0]) ? expanded : activeCardId

  const roundRobinButton =
    !canEdit || users.length === 0
      ? null
      : unassigned > 0
        ? `Assign ${plural(unassigned, 'deal')}`
        : method !== 'round_robin'
          ? 'Use round robin'
          : null

  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-[var(--ew-ink)]">Deal assignment rule</h3>
        <p className="mt-1 text-xs text-[var(--ew-muted)]">
          The rule is saved to this pipeline. New deals follow it from then on.
        </p>
        {!canEdit ? (
          <p className="mt-2 text-xs text-[var(--ew-muted)]">Only superadmins can change the assignment rule.</p>
        ) : null}
      </div>

      <dl className="mb-4 grid grid-cols-3 gap-2">
        <StatTile label="Total deals" value={total} />
        <StatTile label="Assigned" value={assigned} />
        <StatTile label="Unassigned" value={unassigned} highlight={unassigned > 0} />
      </dl>

      {actionError ? <InlineError className="mb-3">{actionError}</InlineError> : null}
      {notice && !actionError ? (
        <p role="status" className="mb-3 text-xs text-[var(--ew-muted)]">
          {notice}
        </p>
      ) : null}

      <div className="space-y-3" role="radiogroup" aria-label="Deal assignment rule">
        {CARDS.map((card) => {
          const isCurrent = card.methods.includes(method)
          const lock = isCurrent ? null : lockOf(card)
          // One rule at a time: the selected card is open and usable, the others are disabled.
          const isOpen = selectedCardId === card.id
          return (
            <article
              key={card.id}
              className={`rounded-control border transition-opacity ${isOpen ? '' : 'opacity-60'}`}
              style={{
                borderColor: isOpen ? '#cc785c' : 'var(--ew-line)',
                background: 'var(--ew-surface)',
              }}
            >
              <button
                type="button"
                role="radio"
                aria-checked={isOpen}
                onClick={() => setExpanded(card.id)}
                disabled={Boolean(lock) || (isBusy && !isOpen)}
                aria-controls={`deal-assign-${card.id}`}
                className="flex w-full items-start gap-3 p-4 text-left disabled:cursor-not-allowed"
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    isOpen ? 'border-[#cc785c]' : 'border-[var(--ew-muted)]'
                  }`}
                  aria-hidden="true"
                >
                  {isOpen ? <span className="h-2 w-2 rounded-full bg-[#cc785c]" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--ew-ink)]">{card.title}</span>
                    {isCurrent ? (
                      <span className="rounded-pill bg-[#cc785c]/10 px-2 py-0.5 text-[11px] font-medium text-[#b76c4f]">
                        Active
                        {card.methods.length > 1 ? ` · ${RULE_LABELS[method]}` : ''}
                        {card.id === 'single_user' && singleUsername ? ` · ${singleUsername}` : ''}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-[var(--ew-muted)]">{card.description}</span>
                </span>
              </button>

              {lock ? (
                <p className="-mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 px-4 pb-3 pl-11 text-xs text-[var(--ew-muted)]">
                  <span>
                    Locked: {plural(lock.count, 'deal')} {lock.count === 1 ? 'was' : 'were'} assigned by{' '}
                    {RULE_LABELS[lock.source].toLowerCase()}.
                  </span>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => openUnassign(lock.source)}
                      disabled={isBusy}
                      className="font-medium text-[#b76c4f] underline underline-offset-2 hover:text-[#cc785c] disabled:opacity-60"
                    >
                      Revert {RULE_LABELS[lock.source].toLowerCase()}
                    </button>
                  ) : null}
                </p>
              ) : null}

              {isOpen ? (
                <div id={`deal-assign-${card.id}`} className="border-t px-4 pb-4 pt-3" style={{ borderColor: 'var(--ew-line)' }}>
                  {!isCurrent ? (
                    <p className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xs bg-ground/60 px-3 py-2 text-xs text-[var(--ew-muted)]">
                      <span>
                        Not active yet. The current rule is{' '}
                        <span className="font-medium text-[var(--ew-ink)]">{RULE_LABELS[method]}</span>.
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpanded(activeCardId)}
                        disabled={isBusy}
                        className="font-medium text-[#b76c4f] underline underline-offset-2 hover:text-[#cc785c] disabled:opacity-60"
                      >
                        Keep {RULE_LABELS[method]}
                      </button>
                    </p>
                  ) : null}
                  {card.id === 'round_robin' ? (
                    <DistributeSection
                      method="round_robin"
                      users={users}
                      usersLabel="Users in this pipeline"
                      summary={
                        users.length === 0
                          ? 'No eligible users in this pipeline. Add users with CRM access first.'
                          : unassigned > 0
                            ? `${plural(unassigned, 'unassigned deal')} will be shared equally among ${plural(users.length, 'user')} (about ${Math.ceil(unassigned / users.length)} each).`
                            : 'No unassigned deals. Saving the rule shares new deals in turn.'
                      }
                      summaryAction={
                        canEdit && roundRobinAssigned > 0 ? (
                          <button
                            type="button"
                            onClick={() => openUnassign('round_robin')}
                            disabled={isBusy}
                            className="shrink-0 text-xs font-medium text-[#b76c4f] underline underline-offset-2 transition-colors hover:text-[#cc785c] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Revert round robin
                          </button>
                        ) : null
                      }
                      buttonLabel={roundRobinButton}
                      run={run}
                      isBusy={isBusy}
                      savingMethod={savingMethod}
                      onAssign={() => handleAssign('round_robin')}
                      owners={overview.roundRobinOwners ?? []}
                      canEdit={canEdit}
                      unassign={unassign}
                      onUnassignUser={(owner) => openUnassign('round_robin', owner)}
                    />
                  ) : null}

                  {card.id === 'single_user' ? (
                    <SingleUserSection
                      key={`${singleUserId ?? 'none'}:${method}`}
                      users={users}
                      isActive={isSingleActive}
                      targetId={singleUserId}
                      targetName={singleUsername}
                      targetEligible={singleUserEligible}
                      unassigned={unassigned}
                      canEdit={canEdit}
                      isBusy={isBusy}
                      savingMethod={savingMethod}
                      run={run}
                      onSaveTarget={handleSaveTarget}
                      onGiveDeals={() => handleAssign('single_user', singleUserId)}
                      owners={overview.singleUserOwners ?? []}
                      unassign={unassign}
                      onUnassign={(owner) => openUnassign('single_user', owner)}
                    />
                  ) : null}

                  {card.id === 'creator_manual' ? (
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Creator or manual">
                      <SubOption
                        method="creator"
                        currentMethod={method}
                        title="Creator"
                        description="The person who adds a deal to this pipeline is assigned to it."
                        Icon={LuUserPlus}
                        canEdit={canEdit}
                        isBusy={isBusy}
                        savingMethod={savingMethod}
                        onSelect={handleSelectRule}
                      />
                      <SubOption
                        method="manual"
                        currentMethod={method}
                        title="Manual"
                        description="New deals stay unassigned. Assign them from the deal details drawer."
                        Icon={LuHand}
                        canEdit={canEdit}
                        isBusy={isBusy}
                        savingMethod={savingMethod}
                        onSelect={handleSelectRule}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          )
        })}
      </div>

      <Alert
        open={Boolean(unassign) && (unassign.status === 'confirm' || !unassign.userId)}
        title={
          unassign?.username
            ? `Unassign deals from ${unassign.username}?`
            : `Revert ${unassign ? RULE_LABELS[unassign.source].toLowerCase() : ''}?`
        }
        description={
          !unassign
            ? ''
            : unassign.username
              ? `This removes ${unassign.username} from ${plural(unassign.total, 'deal')} assigned by the ${RULE_LABELS[
                  unassign.source
                ].toLowerCase()} rule. Their other deals are not affected.${
                  unassign.isReceiver ? ` ${unassign.username} still receives new deals until you choose someone else.` : ''
                }`
              : `This removes the owner from ${plural(unassign.total, 'deal')} assigned by ${RULE_LABELS[
                  unassign.source
                ].toLowerCase()}. Deals assigned another way are not affected, and the rule stays the same.`
        }
        confirmLabel={
          !unassign
            ? 'Unassign'
            : unassign.username
              ? `Unassign ${plural(unassign.total, 'deal')}`
              : `Revert ${plural(unassign.total, 'deal')}`
        }
        confirmingLabel="Unassigning..."
        isConfirming={unassign?.status === 'running'}
        progress={
          unassign?.status === 'running'
            ? {
                label: `Unassigning ${unassign.done} of ${unassign.total} deals...`,
                value: unassign.total ? Math.round((unassign.done / unassign.total) * 100) : 0,
                ariaLabel: 'Unassigning deals',
              }
            : undefined
        }
        feedback={unassign?.error || undefined}
        onConfirm={confirmUnassign}
        onCancel={() => {
          if (unassign?.status !== 'running') setUnassign(null)
        }}
      />
    </div>
  )
}

function StatTile({ label, value, highlight = false }) {
  return (
    <div className="rounded-xs border px-3 py-2" style={{ borderColor: 'var(--ew-line)' }}>
      <dt className="text-[11px] text-[var(--ew-muted)]">{label}</dt>
      <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${highlight ? 'text-[#b76c4f]' : 'text-[var(--ew-ink)]'}`}>
        {value}
      </dd>
    </div>
  )
}

/** Chunked progress for the rule that is currently assigning (`run.method === method`). */
function RunProgress({ run, method }) {
  if (run?.method !== method) return null
  const percent = run.total ? Math.round((run.done / run.total) * 100) : 0
  return (
    <div className="mt-3">
      <div className="flex items-center gap-3">
        <div
          className="h-2 min-w-0 flex-1 overflow-hidden rounded-pill bg-[#cc785c]/15"
          role="progressbar"
          aria-label="Assigning deals"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="h-full rounded-pill bg-[#cc785c] transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
        <span className="shrink-0 text-xs font-medium tabular-nums text-[var(--ew-ink)]">{percent}%</span>
      </div>
      <p role="status" className="mt-1.5 text-xs text-[var(--ew-muted)]">
        {run.status === 'running'
          ? `Assigning ${run.done} of ${run.total} deals...`
          : run.status === 'done'
            ? run.message
            : `Stopped after ${plural(run.done, 'deal')}.`}
      </p>
    </div>
  )
}

function AssignButton({ label, method, run, isBusy, savingMethod, onClick }) {
  if (!label) return null
  const spinning = savingMethod === method || (run?.method === method && run.status === 'running')
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isBusy}
      className="mt-3 inline-flex h-9 max-w-full items-center gap-2 rounded-xs bg-[#cc785c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60"
    >
      {spinning ? <Loader size={0.7} /> : null}
      <span className="truncate">{label}</span>
    </button>
  )
}

/** Progress bar shown under a user's row while their deals are being unassigned. */
function UnassignProgress({ progress, username, className = '' }) {
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0
  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <div
          className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-pill bg-[#cc785c]/15"
          role="progressbar"
          aria-label={`Unassigning ${username || 'user'}'s deals`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="h-full rounded-pill bg-[#cc785c] transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
        <span className="shrink-0 text-[11px] font-medium tabular-nums text-[var(--ew-ink)]">{percent}%</span>
      </div>
      <p role="status" className="mt-1 text-[11px] text-[var(--ew-muted)]">
        Unassigning {progress.done} of {progress.total} deals...
      </p>
    </div>
  )
}

/**
 * Round robin: users with their load, each with its own Unassign for the deals
 * round robin gave them (progress under the row), then the summary (+ the
 * card-wide Unassign), progress and the Assign button.
 */
function DistributeSection({
  method,
  users,
  usersLabel,
  summary,
  summaryAction = null,
  buttonLabel,
  run,
  isBusy,
  savingMethod,
  onAssign,
  owners = [],
  canEdit = false,
  unassign = null,
  onUnassignUser,
}) {
  const ownedBy = new Map(owners.map((owner) => [owner.userId, owner.dealCount]))
  const rows = [
    ...users.map((user) => ({ ...user, eligible: true })),
    // Users who lost access but still own deals from this rule.
    ...owners
      .filter((owner) => !users.some((user) => user.userId === owner.userId))
      .map((owner) => ({ userId: owner.userId, username: owner.username, dealCount: owner.dealCount, eligible: false })),
  ]
  // Rows show only the deals round robin gave each user — exactly what their Unassign removes.
  const maxLoad = Math.max(1, ...rows.map((row) => ownedBy.get(row.userId) ?? 0))

  return (
    <div>
      <p className="text-xs text-[var(--ew-muted)]">{usersLabel}</p>
      {rows.length ? (
        <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {rows.map((row) => {
            const owned = ownedBy.get(row.userId) ?? 0
            const rowRun = unassign?.userId === row.userId && unassign.status === 'running' ? unassign : null
            return (
              <li key={row.userId}>
                <div className="flex items-center gap-3">
                  <span
                    className={`w-28 shrink-0 truncate text-xs ${row.eligible ? 'text-[var(--ew-ink)]' : 'text-[var(--ew-muted)]'}`}
                    title={row.eligible ? row.username : `${row.username} (no access)`}
                  >
                    {row.username}
                    {row.eligible ? '' : ' (no access)'}
                  </span>
                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-pill bg-[var(--ew-line)]">
                    <span
                      className="block h-full rounded-pill bg-[#cc785c]/70"
                      style={{ width: `${((ownedBy.get(row.userId) ?? 0) / maxLoad) * 100}%` }}
                    />
                  </span>
                  <span className="w-14 shrink-0 text-right text-xs tabular-nums text-[var(--ew-muted)]">
                    {plural(ownedBy.get(row.userId) ?? 0, 'deal')}
                  </span>
                  {canEdit ? (
                    <span className="flex w-14 shrink-0 justify-end">
                      {owned > 0 && !rowRun ? (
                        <button
                          type="button"
                          onClick={() => onUnassignUser?.({ userId: row.userId, username: row.username, dealCount: owned })}
                          disabled={isBusy}
                          aria-label={`Unassign ${plural(owned, 'round robin deal')} from ${row.username || 'this user'}`}
                          className="text-xs font-medium text-[#b76c4f] underline underline-offset-2 transition-colors hover:text-[#cc785c] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Unassign
                        </button>
                      ) : null}
                    </span>
                  ) : null}
                </div>
                {rowRun ? <UnassignProgress progress={rowRun} username={row.username} className="mt-1.5 pl-[7.75rem]" /> : null}
              </li>
            )
          })}
        </ul>
      ) : null}

      <RunProgress run={run} method={method} />
      <AssignButton
        label={buttonLabel}
        method={method}
        run={run}
        isBusy={isBusy}
        savingMethod={savingMethod}
        onClick={onAssign}
      />

      {/* Card footer: what the rule will do, and the card-wide Unassign. */}
      <div
        className="-mx-4 -mb-4 mt-4 flex items-center justify-between gap-3 rounded-b-control border-t bg-ground/40 px-4 py-2.5"
        style={{ borderColor: 'var(--ew-line)' }}
      >
        <p className="min-w-0 text-xs text-[var(--ew-muted)]">{summary}</p>
        {summaryAction}
      </div>
    </div>
  )
}

/**
 * Single user: one collapsible list of the pipeline's users.
 * - The header shows who gets new deals; clicking it expands the list inline.
 * - Click a user to pick them; the line under the list says what will happen
 *   and Save makes it the rule (nothing saves on a click).
 * - Each user with deals from this rule has its own Unassign; the progress bar
 *   runs under that user's row.
 * - Users who lost access but still own such deals stay listed (not pickable).
 */
function SingleUserSection({
  users,
  isActive,
  targetId,
  targetName,
  targetEligible,
  unassigned,
  canEdit,
  isBusy,
  savingMethod,
  run,
  unassign,
  onSaveTarget,
  onGiveDeals,
  owners,
  onUnassign,
}) {
  const hasTarget = isActive && Boolean(targetId)
  const [isOpen, setIsOpen] = useState(!hasTarget && canEdit)
  const [draftId, setDraftId] = useState(null)
  const isDirty = Boolean(draftId) && !(hasTarget && draftId === targetId)
  const drafted = users.find((user) => user.userId === draftId)
  const isSaving = savingMethod === 'single_user'
  const canGive = canEdit && hasTarget && targetEligible && unassigned > 0

  const ownedBy = new Map(owners.map((owner) => [owner.userId, owner]))
  const rows = [
    ...users.map((user) => ({
      userId: user.userId,
      username: user.username,
      dealCount: user.dealCount,
      eligible: true,
    })),
    // Owners of single-user deals who are no longer eligible.
    ...owners
      .filter((owner) => !users.some((user) => user.userId === owner.userId))
      .map((owner) => ({
        userId: owner.userId,
        username: owner.username,
        dealCount: owner.dealCount,
        eligible: false,
      })),
  ]

  const save = async () => {
    if (!drafted || !isDirty) return
    const ok = await onSaveTarget(drafted.userId)
    if (ok) {
      setDraftId(null)
      setIsOpen(false)
    }
  }

  const headerLabel = hasTarget ? targetName || 'User unavailable' : 'Choose a user'

  return (
    <div className="space-y-4">
      <section aria-label="User who gets new deals">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ew-muted)]">New deals go to</p>

        <div
          className="mt-2 overflow-hidden rounded-xs border"
          style={{ borderColor: isOpen ? '#cc785c' : hasTarget && !targetEligible ? 'var(--ew-danger, #dc2626)' : 'var(--ew-line)' }}
        >
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-controls="single-user-list"
            className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-ground/50"
          >
            {hasTarget ? <Initial name={targetName} /> : null}
            <span
              className={`min-w-0 flex-1 truncate text-sm ${
                hasTarget ? 'font-medium text-[var(--ew-ink)]' : 'text-[var(--ew-muted)]'
              }`}
            >
              {headerLabel}
            </span>
            <span className="shrink-0 text-[11px] text-[var(--ew-muted)]">{plural(rows.length, 'user')}</span>
            <LuChevronDown
              className={`h-4 w-4 shrink-0 text-[var(--ew-muted)] transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>

          {isOpen ? (
            rows.length === 0 ? (
              <p className="border-t px-3 py-4 text-xs text-[var(--ew-muted)]" style={{ borderColor: 'var(--ew-line)' }}>
                No eligible users in this pipeline. Add users with CRM access first.
              </p>
            ) : (
              <ul
                id="single-user-list"
                role="radiogroup"
                aria-label="Users"
                className="max-h-72 divide-y divide-[var(--ew-line)] overflow-y-auto border-t"
                style={{ borderColor: 'var(--ew-line)' }}
              >
                {rows.map((row) => {
                  const owned = ownedBy.get(row.userId)?.dealCount ?? 0
                  const isTarget = hasTarget && row.userId === targetId
                  const isPicked = draftId ? row.userId === draftId : isTarget
                  const rowRun = unassign?.userId === row.userId && unassign.status === 'running' ? unassign : null
                  const pickable = canEdit && row.eligible && !isBusy
                  return (
                    <li key={row.userId} className={isPicked ? 'bg-[#cc785c]/5' : ''}>
                      <div className="flex items-center gap-3 px-3 py-2">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={isPicked}
                          onClick={() => setDraftId(row.userId === targetId && hasTarget ? null : row.userId)}
                          disabled={!pickable}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                              isPicked ? 'border-[#cc785c]' : 'border-[var(--ew-muted)]'
                            } ${row.eligible ? '' : 'opacity-40'}`}
                            aria-hidden="true"
                          >
                            {isPicked ? <span className="h-2 w-2 rounded-full bg-[#cc785c]" /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block truncate text-sm ${
                                row.eligible ? 'text-[var(--ew-ink)]' : 'text-[var(--ew-muted)]'
                              } ${isPicked ? 'font-medium' : ''}`}
                            >
                              {row.username || 'User unavailable'}
                            </span>
                            <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--ew-muted)]">
                              <span className="tabular-nums">{owned > 0 ? plural(owned, 'deal') : 'No deals'}</span>
                              {isTarget ? (
                                <span>(Gets new deals)</span>
                              ) : null}
                              {!row.eligible ? (
                                <span className="rounded-pill bg-danger-soft px-1.5 py-px font-medium text-danger">
                                  No access
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </button>
                        {canEdit && owned > 0 && !rowRun ? (
                          <button
                            type="button"
                            onClick={() => onUnassign({ userId: row.userId, username: row.username, dealCount: owned })}
                            disabled={isBusy}
                            aria-label={`Unassign ${plural(owned, 'single user deal')} from ${row.username || 'this user'}`}
                            className="shrink-0 text-xs font-medium text-[#b76c4f] underline underline-offset-2 transition-colors hover:text-[#cc785c] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Unassign
                          </button>
                        ) : null}
                      </div>

                      {rowRun ? (
                        <UnassignProgress progress={rowRun} username={row.username} className="px-3 pb-2.5 pl-10" />
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )
          ) : null}
        </div>

        {/* What the selection means, right under the container. */}
        {isDirty && drafted ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 text-xs text-[var(--ew-ink)]">
              <span className="font-medium">{drafted.username}</span> will be assigned new deals.
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setDraftId(null)}
                disabled={isBusy}
                className="h-8 rounded-xs border border-[var(--ew-line)] bg-ground px-3 text-xs font-medium text-[var(--ew-muted)] transition-colors hover:bg-ground/70 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={isBusy}
                className="inline-flex h-8 items-center gap-2 rounded-xs bg-[#cc785c] px-3 text-xs font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60"
              >
                {isSaving ? <Loader size={0.6} /> : null}
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-[var(--ew-muted)]">
            {hasTarget && !targetEligible
              ? `${targetName || 'This user'} can no longer receive deals (inactive or no access). New deals stay unassigned until you choose someone else.`
              : hasTarget
                ? `${targetName} is assigned new deals.`
                : canEdit
                  ? 'Pick a user to get every new deal in this pipeline.'
                  : 'No user chosen.'}
          </p>
        )}
        {canEdit && owners.length > 0 ? (
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--ew-muted)]">
            Unassign removes the owner from that user's single user deals only. It does not change who gets new deals.
          </p>
        ) : null}
      </section>

      {hasTarget && targetEligible && unassigned > 0 ? (
        <section className="border-t pt-3" style={{ borderColor: 'var(--ew-line)' }} aria-label="Unassigned deals">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ew-muted)]">
            Unassigned deals · <span className="tabular-nums">{unassigned}</span>
          </p>
          <p className="mt-1 text-xs text-[var(--ew-muted)]">These deals have no owner. You can give them all to {targetName}.</p>
          <RunProgress run={run} method="single_user" />
          <AssignButton
            label={canGive ? `Give ${plural(unassigned, 'deal')} to ${targetName}` : null}
            method="single_user"
            run={run}
            isBusy={isBusy}
            savingMethod={null}
            onClick={onGiveDeals}
          />
        </section>
      ) : run?.method === 'single_user' ? (
        <RunProgress run={run} method="single_user" />
      ) : null}
    </div>
  )
}

function Initial({ name }) {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#cc785c]/10 text-xs font-semibold uppercase text-[#b76c4f]"
      aria-hidden="true"
    >
      {(name || '?').slice(0, 1)}
    </span>
  )
}

function SubOption({ method, currentMethod, title, description, Icon, canEdit, isBusy, savingMethod, onSelect }) {
  const selected = currentMethod === method
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(method)}
      disabled={!canEdit || isBusy}
      className={`flex flex-col items-start gap-1.5 rounded-xs border p-3 text-left transition-colors disabled:cursor-not-allowed ${
        selected ? 'border-[#cc785c] bg-[#cc785c]/5' : 'border-[var(--ew-line)] hover:bg-ground/60'
      } ${!canEdit && !selected ? 'opacity-60' : ''}`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-[var(--ew-ink)]">
        {savingMethod === method ? <Loader size={0.7} /> : <Icon className="h-4 w-4 text-[#b76c4f]" aria-hidden="true" />}
        {title}
      </span>
      <span className="text-xs leading-relaxed text-[var(--ew-muted)]">{description}</span>
    </button>
  )
}
