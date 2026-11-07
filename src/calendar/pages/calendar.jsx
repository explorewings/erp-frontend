import { useCallback, useMemo, useState } from 'react'
import { LuRefreshCw } from 'react-icons/lu'
import Toast from '../../appcomponents/toast.jsx'
import { useAuth } from '../../authetication/auth-context.js'
import AddEventDrawer from '../components/add-event-drawer.jsx'
import CalendarGrid, { DateSwitcher } from '../components/calendar-grid.jsx'
import EventDrawer from '../components/event-drawer.jsx'
import NewEventMenu from '../components/new-event-menu.jsx'
import { SchedulePanel } from '../components/side-panels.jsx'
import { groupByDay, useCalendarEvents, useCalendarUsers } from '../hooks/use-calendar.js'
import { dayKey, formatFullDate, shiftMonthKeepDay, startOfDay } from '../lib/dates.js'
import { assignableUsers, creatableTypes } from '../lib/policy.js'

/*
 * Calendar: schedule for the selected day on the left, month grid on the right.
 * Selecting a date is the only filter; the panel always shows that day.
 */
export default function Calendar() {
  const { token, user } = useAuth()
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()))
  const [openEventId, setOpenEventId] = useState(null)
  const [addType, setAddType] = useState(null)
  const [toast, setToast] = useState(null)

  // The visible month follows the selected day; only refetch when the month changes.
  const monthIndex = selectedDay.getFullYear() * 12 + selectedDay.getMonth()
  const month = useMemo(() => new Date(Math.floor(monthIndex / 12), monthIndex % 12, 1), [monthIndex])
  const { events, status, error, reload, upsert, remove } = useCalendarEvents(token, month)
  const { users } = useCalendarUsers(token)

  const assignees = useMemo(() => assignableUsers(user, users), [user, users])
  const creatable = useMemo(() => creatableTypes(user), [user])
  const eventsByDay = useMemo(() => groupByDay(events), [events])
  const dayEvents = eventsByDay.get(dayKey(selectedDay)) ?? []
  const openEvent = openEventId ? events.find((event) => event.id === openEventId) ?? null : null

  const selectDay = useCallback((day) => setSelectedDay(startOfDay(day)), [])
  const notify = useCallback((message, type = 'success') => setToast({ message, type, key: Date.now() }), [])
  const loading = status === 'loading'

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-5 lg:grid-cols-[minmax(17rem,23rem)_minmax(0,1fr)]">
      {/* Schedule */}
      <section className="order-2 flex min-w-0 flex-col gap-4 lg:order-1" aria-labelledby="calendar-schedule-title">
        <header className="flex min-h-9 items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 id="calendar-schedule-title" className="text-title font-semibold leading-tight tracking-[-0.01em] text-ink">
              Schedule
            </h1>
            <p className="mt-0.5 text-meta text-muted">{formatFullDate(selectedDay)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => reload({ quiet: true })}
              aria-label="Refresh"
              title="Refresh"
              className="flex h-9 w-9 items-center justify-center rounded-xs border border-line bg-surface text-muted transition-colors hover:bg-ground hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20"
            >
              <LuRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
            </button>
            <NewEventMenu creatable={creatable} onPick={setAddType} />
          </div>
        </header>
        <div className="min-h-0 lg:h-[70vh]">
          <SchedulePanel day={selectedDay} events={dayEvents} viewerId={user?.id} loading={loading} onOpenEvent={setOpenEventId} />
        </div>
      </section>

      {/* Month */}
      <section className="order-1 flex min-w-0 flex-col gap-4 lg:order-2" aria-label="Month">
        <header className="flex min-h-9 items-start justify-end">
          <DateSwitcher
            selectedDay={selectedDay}
            onPrev={() => setSelectedDay((day) => shiftMonthKeepDay(day, -1))}
            onNext={() => setSelectedDay((day) => shiftMonthKeepDay(day, 1))}
            onToday={() => setSelectedDay(startOfDay(new Date()))}
          />
        </header>
        {status === 'error' ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-danger/25 bg-danger-soft px-4 py-2.5">
            <p className="text-body-sm text-danger-strong">{error}</p>
            <button type="button" onClick={() => reload()} className="text-body-sm font-medium text-danger-strong underline underline-offset-4">
              Try again
            </button>
          </div>
        ) : null}
        <div className="h-[26rem] sm:h-[34rem] lg:h-[70vh]">
          <CalendarGrid month={month} selectedDay={selectedDay} eventsByDay={eventsByDay} loading={loading} onSelectDay={selectDay} />
        </div>
      </section>

      {addType ? (
        <AddEventDrawer
          key={`${addType}-${dayKey(selectedDay)}`}
          type={addType}
          day={selectedDay}
          token={token}
          viewer={user}
          users={users}
          assignees={assignees}
          onClose={() => setAddType(null)}
          onCreated={(created) => {
            upsert(created)
            setAddType(null)
            selectDay(new Date(created.type === 'task' ? created.deadline : created.startsAt))
            notify(`${created.title} added.`)
          }}
        />
      ) : null}

      {openEvent ? (
        <EventDrawer
          key={openEvent.id}
          event={openEvent}
          viewer={user}
          token={token}
          users={users}
          assignees={assignees}
          notify={notify}
          onClose={() => setOpenEventId(null)}
          onSaved={upsert}
          onDeleted={(id) => {
            remove(id)
            setOpenEventId(null)
          }}
        />
      ) : null}

      <Toast
        key={toast?.key}
        open={Boolean(toast)}
        message={toast?.message}
        type={toast?.type}
        centerWithinMain
        onClose={() => setToast(null)}
      />
    </div>
  )
}
