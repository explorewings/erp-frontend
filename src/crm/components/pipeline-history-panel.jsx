import { useEffect, useRef, useState } from 'react'
import { LuCheck, LuFilter } from 'react-icons/lu'
import Loader from '../../appcomponents/loader.jsx'
import { formatDateTime } from '../../calendar/lib/dates.js'
import { fetchCrmPipelineActivity } from '../api.js'
import { plural } from '../utils.js'

const METHOD_LABELS = {
  round_robin: 'Round robin',
  single_user: 'Single user',
  creator: 'Creator',
  manual: 'Manual',
}

/** "167 round-robin deals" */
const SOURCE_ADJECTIVES = {
  round_robin: 'round-robin',
  single_user: 'single-user',
  creator: 'creator',
  manual: 'manually assigned',
}

const FILTERS = [
  { id: 'all', label: 'All activity', actions: null },
  { id: 'rule', label: 'Rule changes', actions: 'rule_changed,rule_auto_changed' },
  { id: 'assigned', label: 'Assigned', actions: 'deals_assigned' },
  { id: 'unassigned', label: 'Unassigned', actions: 'deals_unassigned' },
  { id: 'access', label: 'Access changes', actions: 'access_changed' },
]

const who = (username) => username || 'deleted user'
const ruleLabel = (method, username) =>
  method === 'single_user' && username ? `Single user (${username})` : (METHOD_LABELS[method] ?? method ?? 'Unknown')
const names = (list) => list.map((row) => who(row.username)).join(', ')

/**
 * How one history item reads, in the calendar History layout:
 * `label` sits next to the actor, `from`/`to` render as a transition,
 * `detail` is the muted line below, `rows` is an optional per-user split.
 */
function describe(item) {
  const meta = item.meta ?? {}
  const count = Number(meta.count) || 0
  const perUser = Array.isArray(meta.perUser) ? meta.perUser : []
  const view = { label: String(item.action ?? '').replace(/_/g, ' '), from: null, to: null, detail: '', rows: null }
  const splitRows = () =>
    perUser.length > 1
      ? perUser.map((row) => ({ key: row.userId, label: who(row.username), value: plural(row.count, 'deal') }))
      : null

  switch (item.action) {
    case 'rule_changed':
      view.label = 'Rule for new deals changed'
      view.from = ruleLabel(meta.fromMethod, meta.fromUsername)
      view.to = ruleLabel(meta.toMethod, meta.toUsername)
      break
    case 'rule_auto_changed':
      view.label = 'Rule reset'
      view.from = ruleLabel('single_user', meta.username)
      view.to = 'Manual'
      view.detail = `${who(meta.username)} was deleted${meta.dealsUnassigned ? ` · ${plural(meta.dealsUnassigned, 'deal')} unassigned` : ''}`
      break
    case 'deals_assigned':
      if (meta.method === 'single_user') {
        view.label = 'Deals given'
        view.detail = `${plural(count, 'deal')} to ${who(perUser[0]?.username)}`
      } else {
        const equal = perUser.length > 1 && new Set(perUser.map((row) => row.count)).size === 1
        view.label = 'Deals shared'
        view.detail = `${plural(count, 'deal')}${
          equal
            ? ` · ${perUser[0].count} each`
            : perUser.length > 1
              ? ` · among ${plural(perUser.length, 'user')}`
              : perUser.length === 1
                ? ` · all to ${who(perUser[0].username)}`
                : ''
        }`
        view.rows = splitRows()
      }
      break
    case 'deals_unassigned':
      if (meta.reason === 'user_deleted') {
        view.label = 'User deleted'
        view.detail = `${who(meta.username)} deleted · ${plural(count, 'deal')} unassigned`
      } else if (meta.userId) {
        const adjective = SOURCE_ADJECTIVES[meta.source]
        view.label = 'Deals unassigned'
        view.detail = `${count} ${adjective ? `${adjective} ` : ''}deal${count === 1 ? '' : 's'} from ${who(meta.username)}`
      } else {
        view.label = `${METHOD_LABELS[meta.source] ?? 'Assignment'} reverted`
        view.detail = `${plural(count, 'deal')} unassigned`
        view.rows = splitRows()
      }
      break
    case 'access_changed': {
      const added = Array.isArray(meta.added) ? meta.added : []
      const removed = Array.isArray(meta.removed) ? meta.removed : []
      view.label = 'Access users updated'
      view.detail = [
        added.length ? `Added ${names(added)}` : null,
        removed.length ? `Removed ${names(removed)}` : null,
        meta.dealsUnassigned ? `${plural(meta.dealsUnassigned, 'deal')} unassigned` : null,
        meta.ruleChangedTo ? `rule reset to ${METHOD_LABELS[meta.ruleChangedTo] ?? meta.ruleChangedTo}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
      const rows = [
        ...added.map((row) => ({ key: `a-${row.userId}`, label: who(row.username), value: 'Added' })),
        ...removed.map((row) => ({
          key: `r-${row.userId}`,
          label: who(row.username),
          value: row.dealCount ? `Removed · ${plural(row.dealCount, 'deal')} unassigned` : 'Removed',
        })),
      ]
      view.rows = rows.length > 1 ? rows : null
      break
    }
    default:
      break
  }

  // A bulk run that ended with deals still left (closed drawer, error) is partial.
  if (item.runId && Number(meta.remaining) > 0 && (item.action === 'deals_assigned' || item.action === 'deals_unassigned')) {
    view.detail += ` (stopped after ${count})`
  }
  return view
}

/** One timeline card, same layout as the calendar event History tab. */
function HistoryEntry({ item, last, isOpen, onToggle }) {
  const view = describe(item)
  return (
    <li className="relative ml-5 rounded-[10px] border border-line bg-surface px-3 py-2.5">
      {/* Timeline: dot on the connector line; the line runs down to the next card. */}
      <span aria-hidden className="absolute -left-[18px] top-4 h-2.5 w-2.5 rounded-full bg-[#cc785c]" />
      {!last ? <span aria-hidden className="absolute -bottom-[31px] -left-[13px] top-[21px] z-10 w-px bg-[#cc785c]/45" /> : null}
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 truncate text-body-sm text-ink">
          <span className="font-semibold">{item.actor?.username ?? 'System'}</span>
          <span className="text-muted"> · {view.label}</span>
        </p>
        <time className="shrink-0 text-[11px] tabular-nums text-muted">{formatDateTime(item.createdAt)}</time>
      </div>
      {view.from || view.to ? (
        <p className="mt-1 text-meta text-muted">
          {view.from ?? '—'}
          <span className="mx-1.5 text-accent-strong">→</span>
          {view.to ?? '—'}
        </p>
      ) : null}
      {view.detail ? <p className="mt-1 break-words text-meta leading-5 text-ink/75">{view.detail}</p> : null}
      {view.rows ? (
        <>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            className="mt-1 text-meta font-medium text-accent-strong underline-offset-2 hover:underline"
          >
            {isOpen ? 'Hide details' : `Show details (${view.rows.length})`}
          </button>
          {isOpen ? (
            <ul className="mt-1.5 space-y-1 border-t border-line pt-1.5">
              {view.rows.map((row) => (
                <li key={row.key} className="flex items-center justify-between gap-3 text-meta">
                  <span className="min-w-0 truncate text-ink">{row.label}</span>
                  <span className="shrink-0 text-muted">{row.value}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </li>
  )
}

/**
 * History tab of the Assign users drawer (WI-1b): every rule change, bulk
 * assign/unassign run and access change, newest first. A chunked run arrives
 * from the server as one item. Read-only for every pipeline viewer.
 */
export default function PipelineHistoryPanel({ token, pipelineId, isActive, refreshKey }) {
  const [filter, setFilter] = useState('all')
  const [items, setItems] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [reloadTick, setReloadTick] = useState(0)
  const [expandedId, setExpandedId] = useState(null)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const requestRef = useRef(0)
  const filterMenuRef = useRef(null)

  // Close the filter menu on an outside click or Escape (Escape must not close the drawer).
  useEffect(() => {
    if (!isFilterOpen) return undefined
    const onPointer = (event) => {
      if (!filterMenuRef.current?.contains(event.target)) setIsFilterOpen(false)
    }
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setIsFilterOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [isFilterOpen])

  const actions = FILTERS.find((entry) => entry.id === filter)?.actions ?? undefined

  useEffect(() => {
    if (!isActive) return
    const request = ++requestRef.current
    setIsLoading(true)
    setError('')
    fetchCrmPipelineActivity(token, pipelineId, { action: actions })
      .then((data) => {
        if (request !== requestRef.current) return
        setItems(Array.isArray(data?.items) ? data.items : [])
        setNextCursor(data?.hasMore ? data.nextCursor : null)
      })
      .catch((err) => {
        if (request === requestRef.current) setError(err?.message || 'Unable to load the history.')
      })
      .finally(() => {
        if (request === requestRef.current) setIsLoading(false)
      })
  }, [token, pipelineId, isActive, refreshKey, reloadTick, actions])

  const loadMore = async () => {
    if (!nextCursor || isLoadingMore) return
    const request = requestRef.current
    setIsLoadingMore(true)
    setError('')
    try {
      const data = await fetchCrmPipelineActivity(token, pipelineId, { cursor: nextCursor, action: actions })
      if (request !== requestRef.current) return
      setItems((current) => [...current, ...(Array.isArray(data?.items) ? data.items : [])])
      setNextCursor(data?.hasMore ? data.nextCursor : null)
    } catch (err) {
      if (request === requestRef.current) setError(err?.message || 'Unable to load more history.')
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--ew-ink)]">
            Assignment history
            {filter !== 'all' ? (
              <span className="ml-2 text-xs font-medium text-[#b76c4f]">
                · {FILTERS.find((entry) => entry.id === filter)?.label}
              </span>
            ) : null}
          </h3>
          <p className="mt-1 max-w-[17rem] text-xs text-[var(--ew-muted)]">
            Rule changes, bulk assign and unassign runs, and access changes in this pipeline, newest first.
          </p>
        </div>
        <div className="relative shrink-0" ref={filterMenuRef}>
          <button
            type="button"
            onClick={() => setIsFilterOpen((open) => !open)}
            aria-label="Filter history"
            aria-haspopup="menu"
            aria-expanded={isFilterOpen}
            className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e]"
          >
            <LuFilter className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          {isFilterOpen ? (
            <div
              className="absolute right-0 z-30 mt-2 w-44 rounded-control border bg-surface py-1 shadow-panel"
              style={{ borderColor: 'var(--ew-line)' }}
              role="menu"
              aria-label="Filter history"
            >
              {FILTERS.map((entry) => {
                const isOn = entry.id === filter
                return (
                  <button
                    key={entry.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isOn}
                    onClick={() => {
                      setFilter(entry.id)
                      setExpandedId(null)
                      setIsFilterOpen(false)
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-ground/70 ${
                      isOn ? 'bg-accent-soft font-medium text-accent-strong' : 'text-[var(--ew-ink)]'
                    }`}
                  >
                    {entry.label}
                    {isOn ? <LuCheck className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center" role="status" aria-label="Loading history">
          <Loader size={2} />
        </div>
      ) : error && items.length === 0 ? (
        <div className="rounded-xs border border-danger/25 bg-danger-soft px-3 py-2.5 text-body-sm text-danger-strong" role="alert">
          {error}
          <button type="button" onClick={() => setReloadTick((tick) => tick + 1)} className="ml-2 font-medium underline">
            Retry
          </button>
        </div>
      ) : (
        <ul className="relative space-y-2">
          {items.map((item, index) => {
            const key = item.runId ?? `single-${item.id}`
            return (
              <HistoryEntry
                key={key}
                item={item}
                last={index === items.length - 1}
                isOpen={expandedId === key}
                onToggle={() => setExpandedId(expandedId === key ? null : key)}
              />
            )
          })}
          {error ? (
            <li className="rounded-xs border border-danger/25 bg-danger-soft px-3 py-2.5 text-body-sm text-danger-strong" role="alert">
              {error}
            </li>
          ) : null}
          {nextCursor && items.length > 0 ? (
            <li>
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#d9d2c9] bg-white/70 text-xs font-medium text-ink transition-colors hover:border-[#dfae95] hover:bg-[#fff8f3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ew-accent)]/45 disabled:cursor-wait"
              >
                {isLoadingMore ? <Loader size={1.1} /> : 'Load more'}
              </button>
            </li>
          ) : null}
          {!items.length ? (
            <li className="rounded-[10px] border border-dashed border-line px-3 py-6 text-center text-body-sm text-muted">
              {filter === 'all' ? 'No activity recorded yet.' : 'No activity matches this filter.'}
            </li>
          ) : null}
        </ul>
      )}
    </div>
  )
}
