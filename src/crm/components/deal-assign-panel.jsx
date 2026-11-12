import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LuArrowLeftRight,
  LuChevronDown,
  LuCircleUserRound,
  LuHand,
  LuUserCheck,
  LuUserPlus,
} from 'react-icons/lu'
import Loader from '../../appcomponents/loader.jsx'
import {
  distributeCrmUnassignedDeals,
  fetchCrmAssignmentOverview,
  saveCrmAssignmentRule,
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
    Icon: LuArrowLeftRight,
  },
  {
    id: 'creator_manual',
    methods: ['creator', 'manual'],
    title: 'Creator + manual',
    description: 'Give deals to the person who adds them, or assign every deal by hand.',
    Icon: LuCircleUserRound,
  },
  {
    id: 'single_user',
    methods: ['single_user'],
    title: 'Single user',
    description: 'Give every deal to one user you choose.',
    Icon: LuUserCheck,
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
  const [pickedUserId, setPickedUserId] = useState(null)

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

  const isBusy = Boolean(savingMethod) || run?.status === 'running'

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
    if (mountedRef.current) setPickedUserId(null)
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
            `${plural(result.remaining, 'deal')} could not be assigned because no eligible user is available.`,
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
  const isSingleActive = method === 'single_user'
  // The picker starts on the saved user; clicking a row picks someone else.
  const chosenUserId = pickedUserId ?? (isSingleActive && singleUserEligible ? singleUserId : null)
  const chosenUser = users.find((user) => user.userId === chosenUserId)
  const singleUnchanged = isSingleActive && chosenUserId === singleUserId

  const roundRobinButton =
    !canEdit || users.length === 0
      ? null
      : unassigned > 0
        ? `Assign ${plural(unassigned, 'deal')}`
        : method !== 'round_robin'
          ? 'Use round robin'
          : null

  const singleUserButton =
    !canEdit || !chosenUser
      ? null
      : unassigned > 0
        ? `Assign ${plural(unassigned, 'deal')} to ${chosenUser.username}`
        : singleUnchanged
          ? null
          : `Assign new deals to ${chosenUser.username}`

  const singleUserSummary =
    users.length === 0
      ? 'No eligible users in this pipeline. Add users with CRM access first.'
      : !chosenUser
        ? canEdit
          ? 'Pick a user.'
          : 'No user chosen.'
        : unassigned > 0
          ? `${plural(unassigned, 'unassigned deal')} will be assigned to ${chosenUser.username}, and all new deals will go to ${chosenUser.username} too.`
          : singleUnchanged
            ? `All deals are assigned. All new deals go to ${chosenUser.username}.`
            : `All deals are assigned. All new deals will be assigned to ${chosenUser.username}.`

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

      <div className="space-y-3">
        {CARDS.map((card) => {
          const isCurrent = card.methods.includes(method)
          const isOpen = expanded === card.id
          return (
            <article
              key={card.id}
              className="rounded-control border"
              style={{
                borderColor: isCurrent ? '#cc785c' : 'var(--ew-line)',
                background: 'var(--ew-surface)',
              }}
            >
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : card.id)}
                disabled={isBusy && !isOpen}
                aria-expanded={isOpen}
                aria-controls={`deal-assign-${card.id}`}
                className="flex w-full items-start gap-3 p-4 text-left disabled:cursor-not-allowed"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs bg-[#cc785c]/10 text-[#b76c4f]">
                  <card.Icon className="h-4 w-4" aria-hidden="true" />
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
                <LuChevronDown
                  className={`mt-1 h-4 w-4 shrink-0 text-[var(--ew-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {isOpen ? (
                <div id={`deal-assign-${card.id}`} className="border-t px-4 pb-4 pt-3" style={{ borderColor: 'var(--ew-line)' }}>
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
                      buttonLabel={roundRobinButton}
                      run={run}
                      isBusy={isBusy}
                      savingMethod={savingMethod}
                      onAssign={() => handleAssign('round_robin')}
                    />
                  ) : null}

                  {card.id === 'single_user' ? (
                    <DistributeSection
                      method="single_user"
                      users={users}
                      usersLabel={canEdit ? 'Choose the user who receives the deals' : 'Users in this pipeline'}
                      selectedUserId={chosenUserId}
                      onSelectUser={canEdit && !isBusy ? setPickedUserId : null}
                      warning={
                        isSingleActive && !singleUserEligible
                          ? `${singleUsername ?? 'The chosen user'} can no longer receive deals (inactive or no access). New deals stay unassigned until you pick someone else.`
                          : ''
                      }
                      summary={singleUserSummary}
                      buttonLabel={singleUserButton}
                      run={run}
                      isBusy={isBusy}
                      savingMethod={savingMethod}
                      onAssign={() => handleAssign('single_user', chosenUserId)}
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

/**
 * Users with their load, a summary, an optional action button and the chunked
 * progress bar. With `selectedUserId` (even null), the rows become a
 * single-choice picker.
 */
function DistributeSection({
  method,
  users,
  usersLabel,
  selectedUserId,
  onSelectUser,
  warning = '',
  summary,
  buttonLabel,
  run,
  isBusy,
  savingMethod,
  onAssign,
}) {
  const maxLoad = Math.max(1, ...users.map((user) => user.dealCount))
  const isMine = run?.method === method
  const percent = isMine && run.total ? Math.round((run.done / run.total) * 100) : 0
  const isPicker = selectedUserId !== undefined

  return (
    <div>
      <p className="text-xs text-[var(--ew-muted)]">{usersLabel}</p>
      {users.length ? (
        <ul
          className={`mt-2 max-h-56 overflow-y-auto pr-1 ${isPicker ? 'space-y-1' : 'space-y-1.5'}`}
          role={isPicker ? 'radiogroup' : undefined}
          aria-label={isPicker ? usersLabel : undefined}
        >
          {users.map((user) => {
            const selected = isPicker && selectedUserId === user.userId
            return (
              <li key={user.userId} className="flex items-center gap-3">
                {isPicker ? (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onSelectUser?.(user.userId)}
                    disabled={!onSelectUser}
                    title={user.username}
                    className={`flex w-32 shrink-0 items-center gap-2 rounded-xs border px-2 py-1 text-left text-xs text-[var(--ew-ink)] transition-colors disabled:cursor-default ${
                      selected ? 'border-[#cc785c] bg-[#cc785c]/10 font-medium' : 'border-transparent hover:bg-ground/60'
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full border ${
                        selected ? 'border-[#cc785c] bg-[#cc785c]' : 'border-[var(--ew-muted)]'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="truncate">{user.username}</span>
                  </button>
                ) : (
                  <span className="w-28 shrink-0 truncate text-xs text-[var(--ew-ink)]" title={user.username}>
                    {user.username}
                  </span>
                )}
                <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-pill bg-[var(--ew-line)]">
                  <span
                    className="block h-full rounded-pill bg-[#cc785c]/70"
                    style={{ width: `${(user.dealCount / maxLoad) * 100}%` }}
                  />
                </span>
                <span className="w-14 shrink-0 text-right text-xs tabular-nums text-[var(--ew-muted)]">
                  {plural(user.dealCount, 'deal')}
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}

      {warning ? <InlineError className="mt-3">{warning}</InlineError> : null}
      <p className="mt-3 text-xs text-[var(--ew-ink)]">{summary}</p>

      {isMine ? (
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
      ) : null}

      {buttonLabel ? (
        <button
          type="button"
          onClick={onAssign}
          disabled={isBusy}
          className="mt-3 inline-flex h-9 max-w-full items-center gap-2 rounded-xs bg-[#cc785c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60"
        >
          {savingMethod === method || (isMine && run.status === 'running') ? <Loader size={0.7} /> : null}
          <span className="truncate">{buttonLabel}</span>
        </button>
      ) : null}
    </div>
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
