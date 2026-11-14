import { useEffect, useRef, useState } from 'react'
import { LuChevronDown } from 'react-icons/lu'
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

const CARDS = [
  {
    id: 'round_robin',
    methods: ['round_robin'],
    title: 'Round robin',
    description: 'Share deals equally, giving each one to the next user in turn.',
  },
  {
    id: 'single_user',
    methods: ['single_user'],
    title: 'Single user',
    description: 'Give deals to one user you choose.',
  },
  {
    id: 'creator',
    methods: ['creator'],
    title: 'Creator',
    description: 'The person who adds a deal to this pipeline is assigned to it.',
    noTools: true,
  },
  {
    id: 'manual',
    methods: ['manual'],
    title: 'Manual',
    description: 'New deals stay unassigned. Assign them from the deal details drawer.',
    noTools: true,
  },
]

const cardOf = (method) => CARDS.find((card) => card.methods.includes(method))?.id ?? null

/**
 * Deal assign tab. Two independent things live in each card:
 * - The radio "Use for new deals" sets the pipeline's rule. It only affects
 *   deals added from then on; existing owners never change.
 * - The card's tools act on existing deals at any time, whatever the rule:
 *   share unassigned deals equally (round robin), give them to one user
 *   (single user), and Unassign / Revert what that method assigned.
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
  const [run, setRun] = useState(null) // bulk assign: { method, total, done, status, message }
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  // Unassign confirmation: { source, userId, username, isReceiver, total, done, status: 'confirm' | 'running', error }
  const [unassign, setUnassign] = useState(null)
  // Rule change confirmation: { method, userId, username }
  const [ruleConfirm, setRuleConfirm] = useState(null)

  const mountedRef = useRef(true)
  const onRuleChangeRef = useRef(onRuleChange)
  const onDealsChangeRef = useRef(onDealsChange)
  const onBusyChangeRef = useRef(onBusyChange)
  useEffect(() => {
    onRuleChangeRef.current = onRuleChange
    onDealsChangeRef.current = onDealsChange
    onBusyChangeRef.current = onBusyChange
  })
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const isBusy = Boolean(savingMethod) || run?.status === 'running' || unassign?.status === 'running'

  // Lets the drawer refuse to close while an action is running.
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
        setExpanded((current) => current ?? cardOf(data.method))
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

  // ------------------------------------------------------ rule for new deals

  const requestRule = (method, user) => {
    if (!canEdit || isBusy) return
    setActionError('')
    setNotice('')
    setRuleConfirm({ method, userId: user?.userId ?? null, username: user?.username ?? null })
  }

  const confirmRule = async () => {
    if (!ruleConfirm || savingMethod) return
    const { method, userId, username } = ruleConfirm
    setSavingMethod(method)
    try {
      const data = await saveCrmAssignmentRule(token, pipelineId, method, userId ?? undefined)
      if (!mountedRef.current) return
      setOverview(data)
      onRuleChangeRef.current?.(data.method)
      setRuleConfirm(null)
      setNotice(
        method === 'single_user'
          ? `Saved. Every new deal now goes to ${data.singleUsername ?? username ?? 'the chosen user'}.`
          : `Saved. New deals now use ${RULE_LABELS[method].toLowerCase()}.`,
      )
    } catch (err) {
      if (mountedRef.current) {
        setRuleConfirm(null)
        setActionError(err?.message || 'Unable to save the rule for new deals.')
      }
    } finally {
      if (mountedRef.current) setSavingMethod(null)
    }
  }

  // ----------------------------------------------- bulk assign (existing deals)

  /** Assigns the unassigned deals by `method` in chunks, with progress. Never changes the rule. */
  const handleBulk = async (method, user) => {
    if (!canEdit || isBusy || !overview) return
    const total = overview.unassigned
    if (total === 0) return
    setActionError('')
    setNotice('')
    let done = 0
    setRun({ method, total, done, status: 'running', message: '' })
    try {
      for (;;) {
        if (!mountedRef.current) return
        const result = await distributeCrmUnassignedDeals(token, pipelineId, method, user?.userId)
        done += result.assignedCount
        if (mountedRef.current) setRun({ method, total, done: Math.min(done, total), status: 'running', message: '' })
        if (result.remaining === 0) break
        if (result.assignedCount === 0) {
          throw new Error(
            method === 'single_user'
              ? `${user?.username ?? 'That user'} can no longer receive deals. Choose someone else.`
              : `${plural(result.remaining, 'deal')} could not be assigned because no eligible user is available.`,
          )
        }
      }
      if (mountedRef.current) {
        setRun({
          method,
          total,
          done,
          status: 'done',
          message:
            method === 'single_user'
              ? `Gave ${plural(done, 'deal')} to ${user?.username ?? 'the user'}.`
              : `Shared ${plural(done, 'deal')} equally.`,
        })
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

  // ------------------------------------------------------ unassign / revert

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

  /** Unassigns the chosen deals chunk by chunk (progress in the alert, or under the user's row). */
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

  // ---------------------------------------------------------------- render

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
  const ruleCardId = cardOf(method)
  const roundRobinAssigned = overview.assignedBySource?.round_robin ?? 0

  const handleRadio = (card) => {
    if (card.id === ruleCardId) return
    if (card.id !== 'single_user') requestRule(card.id)
    else {
      // Single user needs a person: open the card so one can be picked.
      setExpanded('single_user')
      setActionError('')
      setNotice('Pick a user in Single user, then click Use for new deals.')
    }
  }

  const ruleDescription = (() => {
    if (!ruleConfirm) return ''
    const change = {
      round_robin: `New deals will be shared in turn among ${plural(users.length, 'user')}.`,
      single_user: `Every new deal will go to ${ruleConfirm.username ?? 'the chosen user'}.`,
      creator: 'Whoever adds a deal will own it.',
      manual: 'New deals will stay unassigned until someone assigns them.',
    }[ruleConfirm.method]
    return `${change} Existing deals keep their owners.`
  })()

  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-[var(--ew-ink)]">Deal assignment</h3>
        <p className="mt-1 text-xs text-[var(--ew-muted)]">
          The selected rule decides who gets new deals. Each card's tools work on existing deals at any time.
        </p>
        {!canEdit ? (
          <p className="mt-2 text-xs text-[var(--ew-muted)]">Only superadmins can change deal assignment.</p>
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

      <div className="space-y-3" role="radiogroup" aria-label="Rule for new deals">
        {CARDS.map((card) => {
          const isRule = card.id === ruleCardId
          const isOpen = !card.noTools && expanded === card.id
          return (
            <article
              key={card.id}
              className="rounded-control border"
              style={{ borderColor: isRule ? '#cc785c' : 'var(--ew-line)', background: 'var(--ew-surface)' }}
            >
              <div className="flex items-start gap-3 p-4">
                <button
                  type="button"
                  role="radio"
                  aria-checked={isRule}
                  aria-label={`Use ${card.title} for new deals`}
                  title={isRule ? 'Rule for new deals' : 'Use for new deals'}
                  onClick={() => handleRadio(card)}
                  disabled={!canEdit || isBusy}
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border disabled:cursor-not-allowed"
                  style={{ borderColor: isRule ? '#cc785c' : 'var(--ew-muted)' }}
                >
                  {isRule ? <span className="h-2 w-2 rounded-full bg-[#cc785c]" /> : null}
                </button>
                <button
                  type="button"
                  onClick={() => (card.noTools ? handleRadio(card) : setExpanded(isOpen ? null : card.id))}
                  disabled={card.noTools && (!canEdit || isBusy || isRule)}
                  aria-expanded={card.noTools ? undefined : isOpen}
                  aria-controls={card.noTools ? undefined : `deal-assign-${card.id}`}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-default"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--ew-ink)]">{card.title}</span>
                      {isRule ? (
                        <span className="rounded-pill bg-[#cc785c]/10 px-2 py-0.5 text-[11px] font-medium text-[#b76c4f]">
                          New deals
                          {card.id === 'single_user' && singleUsername ? ` · ${singleUsername}` : ''}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-[var(--ew-muted)]">{card.description}</span>
                  </span>
                  {card.noTools ? null : (
                    <LuChevronDown
                      className={`mt-1 h-4 w-4 shrink-0 text-[var(--ew-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  )}
                </button>
              </div>

              {isOpen ? (
                <div id={`deal-assign-${card.id}`} className="border-t px-4 pb-4 pt-3" style={{ borderColor: 'var(--ew-line)' }}>
                  {card.id === 'round_robin' ? (
                    <RoundRobinSection
                      users={users}
                      unassigned={unassigned}
                      owners={overview.roundRobinOwners ?? []}
                      canEdit={canEdit}
                      isBusy={isBusy}
                      run={run}
                      unassign={unassign}
                      onShare={() => handleBulk('round_robin')}
                      onUnassignUser={(owner) => openUnassign('round_robin', owner)}
                      revertAction={
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
                    />
                  ) : null}

                  {card.id === 'single_user' ? (
                    <SingleUserSection
                      key={`${singleUserId ?? 'none'}:${method}`}
                      users={users}
                      isRule={method === 'single_user'}
                      targetId={singleUserId}
                      targetName={singleUsername}
                      targetEligible={singleUserEligible}
                      unassigned={unassigned}
                      canEdit={canEdit}
                      isBusy={isBusy}
                      run={run}
                      unassign={unassign}
                      owners={overview.singleUserOwners ?? []}
                      onUseForNewDeals={(user) => requestRule('single_user', user)}
                      onGive={(user) => handleBulk('single_user', user)}
                      onUnassign={(owner) => openUnassign('single_user', owner)}
                    />
                  ) : null}
                </div>
              ) : null}
            </article>
          )
        })}
      </div>

      <Alert
        open={Boolean(ruleConfirm)}
        variant="default"
        title={ruleConfirm ? `Use ${RULE_LABELS[ruleConfirm.method].toLowerCase()} for new deals?` : ''}
        description={ruleDescription}
        confirmLabel="Use for new deals"
        confirmingLabel="Saving..."
        isConfirming={Boolean(savingMethod)}
        onConfirm={confirmRule}
        onCancel={() => {
          if (!savingMethod) setRuleConfirm(null)
        }}
      />

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
              ? `This removes ${unassign.username} from ${plural(unassign.total, 'deal')} assigned by ${RULE_LABELS[
                  unassign.source
                ].toLowerCase()}. Their other deals are not affected.${
                  unassign.isReceiver ? ` ${unassign.username} still gets new deals until you change the rule.` : ''
                }`
              : `This removes the owner from ${plural(unassign.total, 'deal')} assigned by ${RULE_LABELS[
                  unassign.source
                ].toLowerCase()}. Deals assigned another way are not affected, and the rule for new deals stays the same.`
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

/** Chunked progress for the bulk tool that is running (`run.method === method`). */
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

function ActionButton({ label, spinning, isBusy, onClick, variant = 'primary' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isBusy}
      className={`inline-flex h-9 max-w-full items-center gap-2 rounded-xs px-4 text-sm font-medium transition-colors disabled:opacity-60 ${
        variant === 'primary'
          ? 'bg-[#cc785c] text-white hover:bg-[#b36a4e]'
          : 'border border-[var(--ew-line)] bg-ground text-[var(--ew-ink)] hover:bg-ground/70'
      }`}
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
 * Round robin tools: per-user round-robin deals (each with Unassign, progress
 * under the row), "Share N unassigned deals equally", and a footer with
 * Revert round robin.
 */
function RoundRobinSection({
  users,
  unassigned,
  owners,
  canEdit,
  isBusy,
  run,
  unassign,
  onShare,
  onUnassignUser,
  revertAction,
}) {
  const ownedBy = new Map(owners.map((owner) => [owner.userId, owner.dealCount]))
  const rows = [
    ...users.map((user) => ({ userId: user.userId, username: user.username, eligible: true })),
    // Users who lost access but still own round-robin deals.
    ...owners
      .filter((owner) => !users.some((user) => user.userId === owner.userId))
      .map((owner) => ({ userId: owner.userId, username: owner.username, eligible: false })),
  ]
  // Rows count only the deals round robin gave each user — exactly what their Unassign removes.
  const maxLoad = Math.max(1, ...rows.map((row) => ownedBy.get(row.userId) ?? 0))
  const running = run?.method === 'round_robin' && run.status === 'running'

  return (
    <div>
      <p className="text-xs text-[var(--ew-muted)]">Deals assigned by round robin</p>
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
                      style={{ width: `${(owned / maxLoad) * 100}%` }}
                    />
                  </span>
                  <span className="w-14 shrink-0 text-right text-xs tabular-nums text-[var(--ew-muted)]">
                    {plural(owned, 'deal')}
                  </span>
                  {canEdit ? (
                    <span className="flex w-14 shrink-0 justify-end">
                      {owned > 0 && !rowRun ? (
                        <button
                          type="button"
                          onClick={() => onUnassignUser({ userId: row.userId, username: row.username, dealCount: owned })}
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
      ) : (
        <p className="mt-2 text-xs text-[var(--ew-muted)]">No eligible users in this pipeline. Add users with CRM access first.</p>
      )}

      <RunProgress run={run} method="round_robin" />
      {canEdit && users.length > 0 && unassigned > 0 ? (
        <div className="mt-3">
          <ActionButton
            label={`Share ${plural(unassigned, 'unassigned deal')} equally`}
            spinning={running}
            isBusy={isBusy}
            onClick={onShare}
          />
        </div>
      ) : null}

      <div
        className="-mx-4 -mb-4 mt-4 flex items-center justify-between gap-3 rounded-b-control border-t bg-ground/40 px-4 py-2.5"
        style={{ borderColor: 'var(--ew-line)' }}
      >
        <p className="min-w-0 text-xs text-[var(--ew-muted)]">
          {users.length === 0
            ? 'No eligible users.'
            : unassigned > 0
              ? `${plural(unassigned, 'unassigned deal')} can be shared among ${plural(users.length, 'user')} (about ${Math.ceil(unassigned / users.length)} each).`
              : 'No unassigned deals.'}
        </p>
        {revertAction}
      </div>
    </div>
  )
}

/**
 * Single user tools: one collapsible list of users (single-user deals per user,
 * each with Unassign; progress under the row). Picking a user offers two
 * separate actions: give the unassigned deals to them now, and/or make them
 * the one who gets new deals (the rule — confirmed in an alert).
 */
function SingleUserSection({
  users,
  isRule,
  targetId,
  targetName,
  targetEligible,
  unassigned,
  canEdit,
  isBusy,
  run,
  unassign,
  owners,
  onUseForNewDeals,
  onGive,
  onUnassign,
}) {
  const hasTarget = isRule && Boolean(targetId)
  const [isOpen, setIsOpen] = useState(!hasTarget && canEdit)
  const [draftId, setDraftId] = useState(null)
  const pickedId = draftId ?? (hasTarget && targetEligible ? targetId : null)
  const picked = users.find((user) => user.userId === pickedId) ?? null
  const pickedIsTarget = Boolean(picked) && hasTarget && picked.userId === targetId
  const giving = run?.method === 'single_user' && run.status === 'running'

  const ownedBy = new Map(owners.map((owner) => [owner.userId, owner.dealCount]))
  const rows = [
    ...users.map((user) => ({ userId: user.userId, username: user.username, eligible: true })),
    // Owners of single-user deals who are no longer eligible.
    ...owners
      .filter((owner) => !users.some((user) => user.userId === owner.userId))
      .map((owner) => ({ userId: owner.userId, username: owner.username, eligible: false })),
  ]

  const headerLabel = hasTarget ? targetName || 'User unavailable' : 'Choose a user'

  return (
    <div className="space-y-3">
      <div
        className="overflow-hidden rounded-xs border"
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
          <span className={`min-w-0 flex-1 truncate text-sm ${hasTarget ? 'font-medium text-[var(--ew-ink)]' : 'text-[var(--ew-muted)]'}`}>
            {headerLabel}
            {hasTarget ? <span className="ml-1.5 text-[11px] font-normal text-[var(--ew-muted)]">(Gets new deals)</span> : null}
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
                const owned = ownedBy.get(row.userId) ?? 0
                const isTarget = hasTarget && row.userId === targetId
                const isPicked = row.userId === pickedId
                const rowRun = unassign?.userId === row.userId && unassign.status === 'running' ? unassign : null
                const pickable = canEdit && row.eligible && !isBusy
                return (
                  <li key={row.userId} className={isPicked ? 'bg-[#cc785c]/5' : ''}>
                    <div className="flex items-center gap-3 px-3 py-2">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={isPicked}
                        onClick={() => setDraftId(row.userId)}
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
                            className={`block truncate text-sm ${row.eligible ? 'text-[var(--ew-ink)]' : 'text-[var(--ew-muted)]'} ${
                              isPicked ? 'font-medium' : ''
                            }`}
                          >
                            {row.username || 'User unavailable'}
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--ew-muted)]">
                            <span className="tabular-nums">{owned > 0 ? plural(owned, 'deal') : 'No deals'}</span>
                            {isTarget ? <span>(Gets new deals)</span> : null}
                            {!row.eligible ? (
                              <span className="rounded-pill bg-danger-soft px-1.5 py-px font-medium text-danger">No access</span>
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
                    {rowRun ? <UnassignProgress progress={rowRun} username={row.username} className="px-3 pb-2.5 pl-10" /> : null}
                  </li>
                )
              })}
            </ul>
          )
        ) : null}
      </div>

      {hasTarget && !targetEligible ? (
        <InlineError>
          {targetName || 'The chosen user'} can no longer receive deals (inactive or no access). New deals stay unassigned
          until you choose someone else.
        </InlineError>
      ) : null}

      {/* What can be done with the picked user, right under the list. */}
      {canEdit && picked ? (
        <div className="space-y-2">
          <p className="text-xs text-[var(--ew-ink)]">
            {pickedIsTarget ? (
              <>
                <span className="font-medium">{picked.username}</span> gets new deals.
              </>
            ) : (
              <>
                <span className="font-medium">{picked.username}</span> will be assigned new deals if you use them for new
                deals.
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {unassigned > 0 ? (
              <ActionButton
                label={`Give ${plural(unassigned, 'unassigned deal')} to ${picked.username}`}
                spinning={giving}
                isBusy={isBusy}
                onClick={() => onGive(picked)}
              />
            ) : null}
            {!pickedIsTarget ? (
              <ActionButton
                label="Use for new deals"
                variant="secondary"
                isBusy={isBusy}
                onClick={() => onUseForNewDeals(picked)}
              />
            ) : null}
            {draftId && draftId !== (hasTarget ? targetId : null) ? (
              <button
                type="button"
                onClick={() => setDraftId(null)}
                disabled={isBusy}
                className="h-9 px-2 text-xs font-medium text-[var(--ew-muted)] underline underline-offset-2 hover:text-[var(--ew-ink)] disabled:opacity-60"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      ) : canEdit && users.length > 0 ? (
        <p className="text-xs text-[var(--ew-muted)]">
          Pick a user to give them the unassigned deals, or to make them get every new deal.
        </p>
      ) : null}

      <RunProgress run={run} method="single_user" />

      {canEdit && owners.length > 0 ? (
        <p className="text-[11px] leading-relaxed text-[var(--ew-muted)]">
          Unassign removes the owner from that user's single user deals only. It does not change who gets new deals.
        </p>
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
