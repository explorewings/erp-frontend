import { useRef } from 'react'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'
import { EVENT_TYPES } from '../lib/event-meta.js'
import { WEEKDAYS, addDays, dayKey, formatDayLong, formatFullDate, isSameDay, monthGrid } from '../lib/dates.js'

/** Compact date switcher: the selected date (click = today) and month arrows. */
export function DateSwitcher({ selectedDay, onPrev, onNext, onToday }) {
  const isToday = isSameDay(selectedDay, new Date())
  const arrow =
    'flex h-9 w-9 items-center justify-center text-muted transition-colors hover:bg-ground hover:text-ink focus-visible:relative focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25'
  return (
    <div className="inline-flex h-9 items-stretch overflow-hidden rounded-xs border border-line bg-surface">
      <button
        type="button"
        onClick={onToday}
        title={isToday ? undefined : 'Go to today'}
        aria-label={isToday ? `${formatFullDate(selectedDay)}, today` : `${formatFullDate(selectedDay)}. Go to today`}
        className="px-3.5 text-body-sm font-medium tabular-nums text-ink transition-colors hover:bg-ground focus-visible:relative focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
        aria-live="polite"
      >
        {formatFullDate(selectedDay)}
      </button>
      <button type="button" onClick={onPrev} aria-label="Previous month" className={`${arrow} border-l border-line`}>
        <LuChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" onClick={onNext} aria-label="Next month" className={`${arrow} border-l border-line`}>
        <LuChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

/**
 * Month grid. Days only carry their number and one dot per event type; the
 * schedule panel lists what is on the selected day.
 */
export default function CalendarGrid({ month, selectedDay, eventsByDay, loading, onSelectDay }) {
  const days = monthGrid(month)
  const weeks = days.length / 7
  const today = new Date()
  const buttonRefs = useRef(new Map())

  const onKeyDown = (keyEvent, day) => {
    const deltas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    const delta = deltas[keyEvent.key]
    if (delta === undefined) return
    keyEvent.preventDefault()
    const next = addDays(day, delta)
    onSelectDay(next)
    requestAnimationFrame(() => buttonRefs.current.get(dayKey(next))?.focus())
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-panel border border-line bg-surface">
      {loading ? (
        <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden" role="progressbar" aria-label="Loading events">
          <div className="h-full w-1/3 animate-[calendar-load_1.1s_ease-in-out_infinite] bg-[#cc785c] motion-reduce:animate-none" />
        </div>
      ) : null}

      <div className="grid shrink-0 grid-cols-7 border-b border-line" aria-hidden="true">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="py-3 text-center text-micro font-semibold uppercase tracking-[0.08em] text-muted">
            {weekday}
          </div>
        ))}
      </div>

      <div
        className="grid min-h-0 flex-1 grid-cols-7"
        style={{ gridTemplateRows: `repeat(${weeks}, minmax(3.25rem, 1fr))` }}
        role="grid"
        aria-label="Month"
      >
        {days.map((day, index) => {
          const key = dayKey(day)
          const events = eventsByDay.get(key) ?? []
          const types = [...new Set(events.map((event) => event.type))]
          const inMonth = day.getMonth() === month.getMonth()
          const isToday = isSameDay(day, today)
          const isSelected = isSameDay(day, selectedDay)

          return (
            <div
              key={key}
              role="gridcell"
              aria-selected={isSelected}
              className={`min-w-0 border-line ${index % 7 === 6 ? '' : 'border-r'} ${
                index >= days.length - 7 ? '' : 'border-b'
              }`}
            >
              <button
                ref={(node) => {
                  if (node) buttonRefs.current.set(key, node)
                  else buttonRefs.current.delete(key)
                }}
                type="button"
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onSelectDay(day)}
                onKeyDown={(keyEvent) => onKeyDown(keyEvent, day)}
                aria-label={`${formatDayLong(day)}${isToday ? ', today' : ''}${
                  events.length ? `, ${events.length} ${events.length === 1 ? 'item' : 'items'}` : ''
                }`}
                aria-current={isToday ? 'date' : undefined}
                className={`group flex h-full w-full flex-col items-center gap-1.5 pt-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60 sm:pt-4 ${
                  isSelected ? 'bg-accent-soft' : 'hover:bg-ground/60'
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-pill text-body-sm tabular-nums transition-colors ${
                    isSelected
                      ? 'bg-[#cc785c] font-semibold text-white'
                      : isToday
                        ? 'font-semibold text-accent-strong ring-1 ring-inset ring-[#cc785c]'
                        : inMonth
                          ? 'font-medium text-ink'
                          : 'text-muted/60'
                  }`}
                >
                  {day.getDate()}
                </span>
                {types.length ? (
                  <span className="flex gap-1" aria-hidden="true">
                    {types.map((type) => (
                      <span
                        key={type}
                        className="h-1.5 w-1.5 rounded-pill"
                        style={{ background: EVENT_TYPES[type]?.color, opacity: inMonth ? 1 : 0.45 }}
                      />
                    ))}
                  </span>
                ) : null}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
