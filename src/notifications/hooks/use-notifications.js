import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchNotifications, fetchUnreadCount, markNotificationsRead } from '../api.js'

const POLL_MS = 30_000

/**
 * Unread count for the bell (polled every 30 s, and again whenever the tab
 * regains focus) plus the paged list for the drawer, loaded when it opens.
 */
export function useNotifications(token) {
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const pageRef = useRef(1)
  const listRequest = useRef(0)

  const refreshCount = useCallback(async () => {
    if (!token) return
    try {
      setUnread(await fetchUnreadCount(token))
    } catch {
      /* the bell keeps its last count; the drawer surfaces real errors */
    }
  }, [token])

  useEffect(() => {
    refreshCount()
    const timer = window.setInterval(refreshCount, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshCount()
    }
    window.addEventListener('focus', refreshCount)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshCount)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refreshCount])

  const loadFirst = useCallback(async () => {
    const id = ++listRequest.current
    setStatus('loading')
    setError('')
    try {
      const data = await fetchNotifications(token, 1)
      if (id !== listRequest.current) return
      pageRef.current = 1
      setItems(data.items ?? [])
      setHasMore(Boolean(data.hasMore))
      setUnread(Number(data.unread ?? 0))
      setStatus('ready')
    } catch (err) {
      if (id !== listRequest.current) return
      setError(err.message)
      setStatus('error')
    }
  }, [token])

  const loadMore = useCallback(async () => {
    const id = listRequest.current
    setLoadingMore(true)
    setError('')
    try {
      const next = pageRef.current + 1
      const data = await fetchNotifications(token, next)
      if (id !== listRequest.current) return
      pageRef.current = next
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id))
        return [...current, ...(data.items ?? []).filter((item) => !seen.has(item.id))]
      })
      setHasMore(Boolean(data.hasMore))
    } catch (err) {
      if (id === listRequest.current) setError(err.message)
    } finally {
      if (id === listRequest.current) setLoadingMore(false)
    }
  }, [token])

  /** Optimistic: the row reads as read immediately; the server count wins when it answers. */
  const markRead = useCallback(
    async (ids) => {
      const now = new Date().toISOString()
      const target = ids ? new Set(ids) : null
      setItems((current) => current.map((item) => (!item.readAt && (!target || target.has(item.id)) ? { ...item, readAt: now } : item)))
      setUnread((count) => (target ? Math.max(0, count - ids.length) : 0))
      try {
        setUnread(await markNotificationsRead(token, ids))
      } catch {
        refreshCount()
      }
    },
    [token, refreshCount],
  )

  return { unread, items, status, error, hasMore, loadingMore, loadFirst, loadMore, markRead, refreshCount }
}
