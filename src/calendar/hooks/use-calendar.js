import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchCalendarEvents, fetchCalendarUsers } from '../api.js'
import { eventDayKeys, gridRange } from '../lib/dates.js'

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
    list.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt) || a.id - b.id)
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
