import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchCrmDeals, moveCrmDeal } from '../api.js'

/**
 * Deals of the selected pipeline. Reloads when the pipeline changes.
 * Moves are optimistic and silent: the card moves at once and stays usable;
 * only a failure is shown, by putting the card back and setting moveError.
 */
export default function useCrmDeals(token, pipelineId) {
  const [deals, setDeals] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [moveError, setMoveError] = useState('')
  const [reloadTick, setReloadTick] = useState(0)
  // Guards against a response for a pipeline that is no longer selected.
  const pipelineRef = useRef(pipelineId)
  // Latest deals, read by moveDeal to know the stage to roll back to.
  const dealsRef = useRef(deals)
  // Per deal: number of the latest move request, and the last stage the
  // server confirmed. A card can be moved again before an earlier save
  // finishes; only the latest request updates the UI, and a failure puts the
  // card back on the last confirmed stage.
  const latestMoveRef = useRef(new Map())
  const confirmedStageRef = useRef(new Map())
  useEffect(() => {
    pipelineRef.current = pipelineId
    dealsRef.current = deals
  })

  useEffect(() => {
    setDeals([])
    setMoveError('')
    latestMoveRef.current.clear()
    confirmedStageRef.current.clear()
    if (!token || !pipelineId) return undefined
    let cancelled = false
    setIsLoading(true)
    setError('')
    fetchCrmDeals(token, pipelineId)
      .then((list) => {
        if (!cancelled) setDeals(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Unable to load deals.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, pipelineId, reloadTick])

  const reload = useCallback(() => setReloadTick((tick) => tick + 1), [])

  /** Adds a deal returned by the server (newest first, like the list endpoint). */
  const addDeal = useCallback((deal) => {
    if (deal.pipelineId !== pipelineRef.current) return
    setDeals((current) => [deal, ...current.filter((item) => item.id !== deal.id)])
  }, [])

  const updateDeal = useCallback((deal) => {
    if (deal.pipelineId !== pipelineRef.current) return
    setDeals((current) => current.map((item) => (item.id === deal.id ? deal : item)))
  }, [])

  const removeDeal = useCallback((dealId) => {
    setDeals((current) => current.filter((item) => item.id !== dealId))
  }, [])

  const moveDeal = useCallback(
    async (dealId, stageId) => {
      const deal = dealsRef.current.find((item) => item.id === dealId)
      if (!deal || deal.stageId === stageId) return

      if (!confirmedStageRef.current.has(dealId)) confirmedStageRef.current.set(dealId, deal.stageId)
      const request = (latestMoveRef.current.get(dealId) ?? 0) + 1
      latestMoveRef.current.set(dealId, request)
      const isLatest = () => latestMoveRef.current.get(dealId) === request

      setMoveError('')
      setDeals((current) => current.map((item) => (item.id === dealId ? { ...item, stageId } : item)))

      try {
        const saved = await moveCrmDeal(token, dealId, stageId)
        confirmedStageRef.current.set(dealId, saved.stageId)
        if (isLatest()) {
          setDeals((current) => current.map((item) => (item.id === dealId ? saved : item)))
          confirmedStageRef.current.delete(dealId)
        }
      } catch (err) {
        if (!isLatest()) return
        const fallbackStageId = confirmedStageRef.current.get(dealId)
        confirmedStageRef.current.delete(dealId)
        setDeals((current) =>
          current.map((item) => (item.id === dealId ? { ...item, stageId: fallbackStageId } : item)),
        )
        setMoveError(err?.message || 'Unable to move deal.')
      }
    },
    [token],
  )

  return {
    deals,
    isLoading,
    error,
    moveError,
    clearMoveError: () => setMoveError(''),
    reload,
    addDeal,
    updateDeal,
    removeDeal,
    moveDeal,
  }
}
