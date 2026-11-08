import Loader from '../../appcomponents/loader.jsx'
import { definitionFor } from '../events/events.jsx'
import { formatDayLong } from '../lib/dates.js'
import { EVENT_TYPES } from '../lib/event-meta.js'
import { StatusBadge } from './status-badge.jsx'

/*
 * The schedule column borrows the CRM kanban language: a recessed lane holding
 * lifted, deal-style cards.
 */

const lane = {
  borderColor: 'rgba(255,255,255,0.9)',
  borderRadius: '16px',
  background: 'rgba(255,255,255,0.58)',
  boxShadow:
    'inset 3px 3px 8px rgba(27,26,24,0.05), inset -3px -3px 8px rgba(255,255,255,0.95), 8px 10px 22px rgba(221,194,178,0.40), -6px -6px 16px rgba(255,255,255,0.95)',
}

function EventCard({ event, viewerId, onOpen }) {
  const definition = definitionFor(event.type)
  const rows = definition?.cardRows?.(event, viewerId) ?? []
  const type = EVENT_TYPES[event.type]
  const muted = event.effectiveStatus === 'cancelled'

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${type?.label}: ${event.title}`}
      onClick={() => onOpen(event.id)}
      onKeyDown={(keyEvent) => {
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          keyEvent.preventDefault()
          onOpen(event.id)
        }
      }}
      className="group relative cursor-pointer rounded-[10px] border border-[#d9d2c9] bg-[var(--ew-surface)] px-3 py-2 shadow-[0_1px_2px_rgba(27,26,24,0.08),0_4px_10px_-6px_rgba(27,26,24,0.2)] outline-none transition-[background-color,border-color,box-shadow] duration-150 ease-out hover:border-[#dfae95] hover:bg-[#fff8f3] hover:shadow-[0_1px_2px_rgba(27,26,24,0.08),0_8px_18px_-8px_rgba(183,108,79,0.32)] focus-visible:border-[var(--ew-accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--ew-accent)]/45"
    >
      <div className="flex items-start gap-2">
        <h3
          className={`min-w-0 flex-1 truncate text-sm font-semibold leading-5 ${muted ? 'text-[var(--ew-muted)] line-through' : 'text-[var(--ew-ink)]'}`}
          title={event.title}
        >
          {event.title}
        </h3>
        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium leading-4 text-[var(--ew-muted)]">
          <span className="h-1.5 w-1.5 rounded-pill" style={{ background: type?.color }} aria-hidden="true" />
          {type?.label}
        </span>
      </div>

      <div className="mt-1.5 flex items-end justify-between gap-3">
        {rows.length ? (
          <dl className="min-w-0 flex-1 space-y-0.5">
            {rows.map(({ icon: Icon, text, tone }) => (
              <div
                key={text}
                className={`flex min-w-0 items-center gap-2 text-xs leading-5 ${
                  tone === 'danger' ? 'text-danger-strong' : tone === 'accent' ? 'text-accent-strong' : 'text-[var(--ew-muted)]'
                }`}
              >
                <dt className="shrink-0">
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                </dt>
                <dd className="min-w-0 truncate tabular-nums" title={text}>
                  {text}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <span className="flex-1" />
        )}
        <StatusBadge status={event.effectiveStatus} count={event.rejectCount} />
      </div>
    </article>
  )
}

/** Everything on the selected day, as a kanban-style column that fills its height.
 *  Ordered by latest update first, so freshly changed items surface on top. */
export function SchedulePanel({ day, events, viewerId, loading, error, onRetry, hasMore, loadingMore, onLoadMore, onOpenEvent }) {
  const ordered = [...events].sort((a, b) => new Date(b.updatedAt ?? 0) - new Date(a.updatedAt ?? 0));
  return (
    <section className="flex h-full min-h-0 flex-col" aria-label={`Schedule for ${formatDayLong(day)}`}>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto border p-2.5" style={lane}>
        {ordered.length ? (
          <>
            {ordered.map((event) => (
              <EventCard key={event.id} event={event} viewerId={viewerId} onOpen={onOpenEvent} />
            ))}
            {error ? (
              <p className="px-1 pt-1 text-center text-[11px] text-danger-strong" role="alert">
                {error}
              </p>
            ) : null}
            {hasMore ? (
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#d9d2c9] bg-white/70 text-xs font-medium text-[var(--ew-ink)] transition-colors hover:border-[#dfae95] hover:bg-[#fff8f3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ew-accent)]/45 disabled:cursor-wait"
              >
                {loadingMore ? <Loader size={1.1} /> : 'Load more'}
              </button>
            ) : null}
          </>
        ) : (
          <div
            className="flex h-full min-h-40 flex-col items-center justify-center rounded-[6px] border border-dashed px-3 py-6 text-center"
            style={{ borderColor: 'var(--ew-line)' }}
          >
            {error ? (
              <>
                <p className="text-xs font-medium text-danger-strong" role="alert">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-2 text-[11px] font-medium text-[var(--ew-ink)] underline underline-offset-4 hover:text-accent-strong"
                >
                  Try again
                </button>
              </>
            ) : (
              loading ? (
                <div role="status" aria-label="Loading the schedule">
                  <Loader size={2.2} />
                </div>
              ) : (
                <>
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--ew-muted)]">Nothing scheduled</p>
                  <p className="mt-1 max-w-[22ch] text-[11px] leading-5 text-[var(--ew-muted)]">Pick another date or add an event.</p>
                </>
              )
            )}
          </div>
        )}
      </div>
    </section>
  )
}
