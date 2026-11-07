import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchCalendarEvents, fetchCalendarUsers } from '../api.js'
import { addDays, dayKey, eventDayKeys, fromDayKey, gridRange, startOfDay } from '../lib/dates.js'

/** Loads every event in the visible 6-week grid; the month view never paginates. */
export function useCalendarEvents(token, month) {
  const [events, setEvents] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const requestId = useRef(0)
  const range = useMemo(() => gridRange(month), [month])

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      const id = ++requestId.current
      if (!quiet) setStatus('loading')
      setError('')
      try {
        const { events: rows } = await fetchCalendarEvents(token, range)
        if (id !== requestId.current) return
        setEvents(rows)
        setStatus('ready')
      } catch (err) {
        if (id !== requestId.current) return
        setError(err.message)
        setStatus('error')
      }
    },
    [token, range],
  )

  useEffect(() => {
    load()
  }, [load])

  const upsert = useCallback((event) => {
    setEvents((current) => {
      const exists = current.some((item) => item.id === event.id)
      return exists ? current.map((item) => (item.id === event.id ? event : item)) : [...current, event]
    })
  }, [])

  const remove = useCallback((id) => {
    setEvents((current) => current.filter((item) => item.id !== id))
  }, [])

  return { events, status, error, reload: load, upsert, remove }
}

/** A task's place in the day is its deadline; everything else sorts by start (matches the server). */
const when = (event) => new Date(event.type === 'task' ? event.deadline : event.startsAt).getTime()
const byWhen = (a, b) => when(a) - when(b) || a.id - b.id

export const DAY_PAGE_SIZE = 20

/**
 * The selected day's schedule, fetched from the server for that day only and
 * paged 20 at a time (plan Phase 3: the day panel fetches independently of the
 * month grid). Switching dates or refreshing goes back to the first page; late
 * responses for a day or page that is no longer current are ignored.
 */
export function useDayEvents(token, day) {
  const [events, setEvents] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const pageRef = useRef(1)
  const requestId = useRef(0)
  const key = dayKey(day)

  const range = useCallback(() => {
    const from = startOfDay(fromDayKey(key))
    return { from, to: new Date(addDays(from, 1).getTime() - 1) }
  }, [key])

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      const id = ++requestId.current
      if (!quiet) {
        setEvents([])
        setHasMore(false)
        setStatus('loading')
      }
      setError('')
      setLoadingMore(false)
      try {
        const page = await fetchCalendarEvents(token, { ...range(), page: 1, pageSize: DAY_PAGE_SIZE })
        if (id !== requestId.current) return
        pageRef.current = 1
        setEvents(page.events.filter((event) => eventDayKeys(event).includes(key)))
        setHasMore(page.hasMore)
        setStatus('ready')
      } catch (err) {
        if (id !== requestId.current) return
        setError(err.message)
        setStatus('error')
      }
    },
    [token, key, range],
  )

  const loadMore = useCallback(async () => {
    const id = requestId.current
    setLoadingMore(true)
    setError('')
    try {
      const next = pageRef.current + 1
      const page = await fetchCalendarEvents(token, { ...range(), page: next, pageSize: DAY_PAGE_SIZE })
      if (id !== requestId.current) return
      pageRef.current = next
      setEvents((current) => {
        const seen = new Set(current.map((event) => event.id))
        const fresh = page.events.filter((event) => !seen.has(event.id) && eventDayKeys(event).includes(key))
        return [...current, ...fresh]
      })
      setHasMore(page.hasMore)
    } catch (err) {
      if (id === requestId.current) setError(err.message)
    } finally {
      if (id === requestId.current) setLoadingMore(false)
    }
  }, [token, key, range])

  useEffect(() => {
    load()
  }, [load])

  /** Apply a saved event locally: keep it if it still falls on this day, drop it if it moved away. */
  const upsert = useCallback(
    (event) => {
      setEvents((current) => {
        const rest = current.filter((item) => item.id !== event.id)
        return eventDayKeys(event).includes(key) ? [...rest, event].sort(byWhen) : rest
      })
    },
    [key],
  )

  const remove = useCallback((id) => {
    setEvents((current) => current.filter((item) => item.id !== id))
  }, [])

  return { events, status, error, hasMore, loadingMore, reload: load, loadMore, upsert, remove }
}

/** Groups events by every local day they touch, sorted by start time. */
export function groupByDay(events) {
  const map = new Map()
  for (const event of events) {
    for (const key of eventDayKeys(event)) {
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }
  }
  for (const list of map.values()) {
    list.sort(byWhen)
  }
  return map
}

export function useCalendarUsers(token) {
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    fetchCalendarUsers(token)
      .then((rows) => alive && setUsers(rows))
      .catch((err) => alive && setError(err.message))
    return () => {
      alive = false
    }
  }, [token])

  return { users, error }
}
