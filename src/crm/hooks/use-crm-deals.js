import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchCrmBoard, fetchCrmStageDeals, moveCrmDeal } from '../api.js'

const SEARCH_DEBOUNCE_MS = 300
const EMPTY = {}

/** Adds `delta` to one stage's total in an `{ [stageId]: total }` map. */
const bump = (totals, stageId, delta) => ({ ...totals, [stageId]: Math.max(0, (totals[stageId] ?? 0) + delta) })

/**
 * Deals of the selected pipeline, paged per stage on the server: the board
 * loads the newest 100 of every stage plus each stage's true total, and
 * `loadMore(stageId)` fetches that column's next 100. `query` searches client
 * name / email / phone on the server (debounced), so it also finds deals that
 * were not loaded yet.
 *
 * Moves are optimistic and silent: the card moves at once and stays usable;
 * only a failure is shown, by putting the card back and setting moveError.
 * Stage totals follow every add / move / update / remove.
 */
export default function useCrmDeals(token, pipelineId, query = '') {
  const [deals, setDeals] = useState([])
  const [stageTotals, setStageTotals] = useState(EMPTY)
  const [stageCursors, setStageCursors] = useState(EMPTY)
  const [loadingStages, setLoadingStages] = useState(EMPTY)
  const [stageErrors, setStageErrors] = useState(EMPTY)
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const [moveError, setMoveError] = useState('')
  const [reloadTick, setReloadTick] = useState(0)
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim())

  // Guards against a response for a pipeline / search that is no longer current.
  const pipelineRef = useRef(pipelineId)
  const generationRef = useRef(0)
  // Latest deals and cursors, read by callbacks without re-creating them.
  const dealsRef = useRef(deals)
  const cursorsRef = useRef(stageCursors)
  const loadingStagesRef = useRef(loadingStages)
  const queryRef = useRef(debouncedQuery)
  // Per deal: number of the latest move request, and the last stage the
  // server confirmed. A card can be moved again before an earlier save
  // finishes; only the latest request updates the UI, and a failure puts the
  // card back on the last confirmed stage.
  const latestMoveRef = useRef(new Map())
  const confirmedStageRef = useRef(new Map())
  useEffect(() => {
    pipelineRef.current = pipelineId
    dealsRef.current = deals
    cursorsRef.current = stageCursors
    loadingStagesRef.current = loadingStages
    queryRef.current = debouncedQuery
  })

  useEffect(() => {
    const next = query.trim()
    if (next === debouncedQuery) return undefined
    const timer = setTimeout(() => setDebouncedQuery(next), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, debouncedQuery])

  // A new pipeline starts from an empty board (full loader); a new search
  // keeps the current cards on screen until the results arrive.
  const lastPipelineRef = useRef(null)
  useEffect(() => {
    const pipelineChanged = lastPipelineRef.current !== pipelineId
    lastPipelineRef.current = pipelineId
    const generation = ++generationRef.current
    setMoveError('')
    latestMoveRef.current.clear()
    confirmedStageRef.current.clear()
    setLoadingStages(EMPTY)
    setStageErrors(EMPTY)
    if (pipelineChanged) {
      setDeals([])
      setStageTotals(EMPTY)
      setStageCursors(EMPTY)
    }
    if (!token || !pipelineId) {
      setDeals([])
      setStageTotals(EMPTY)
      setStageCursors(EMPTY)
      return undefined
    }
    if (pipelineChanged) setIsLoading(true)
    else setIsSearching(true)
    setError('')
    fetchCrmBoard(token, pipelineId, debouncedQuery)
      .then((board) => {
        if (generation !== generationRef.current) return
        const stages = Array.isArray(board?.stages) ? board.stages : []
        setDeals(stages.flatMap((stage) => stage.deals ?? []))
        setStageTotals(Object.fromEntries(stages.map((stage) => [stage.stageId, stage.total ?? 0])))
        setStageCursors(Object.fromEntries(stages.map((stage) => [stage.stageId, stage.nextCursor ?? null])))
      })
      .catch((err) => {
        if (generation === generationRef.current) setError(err?.message || 'Unable to load deals.')
      })
      .finally(() => {
        if (generation !== generationRef.current) return
        setIsLoading(false)
        setIsSearching(false)
      })
    return undefined
  }, [token, pipelineId, debouncedQuery, reloadTick])

  const reload = useCallback(() => setReloadTick((tick) => tick + 1), [])

  /** Fetches the next 100 deals of one column; no-op when it is complete or already loading. */
  const loadMore = useCallback(
    async (stageId) => {
      const cursor = cursorsRef.current[stageId]
      if (!token || !pipelineRef.current || !cursor || loadingStagesRef.current[stageId]) return
      const generation = generationRef.current
      setLoadingStages((current) => ({ ...current, [stageId]: true }))
      loadingStagesRef.current = { ...loadingStagesRef.current, [stageId]: true }
      setStageErrors((current) => ({ ...current, [stageId]: '' }))
      try {
        const page = await fetchCrmStageDeals(token, pipelineRef.current, stageId, {
          cursor,
          q: queryRef.current,
        })
        if (generation !== generationRef.current) return
        setDeals((current) => {
          const known = new Set(current.map((deal) => deal.id))
          return [...current, ...(page?.deals ?? []).filter((deal) => !known.has(deal.id))]
        })
        setStageCursors((current) => ({ ...current, [stageId]: page?.nextCursor ?? null }))
      } catch (err) {
        if (generation === generationRef.current) {
          setStageErrors((current) => ({ ...current, [stageId]: err?.message || 'Unable to load more deals.' }))
        }
      } finally {
        if (generation === generationRef.current) {
          setLoadingStages((current) => ({ ...current, [stageId]: false }))
          loadingStagesRef.current = { ...loadingStagesRef.current, [stageId]: false }
        }
      }
    },
    [token],
  )

  /** Adds a deal returned by the server (newest first, like the board). */
  const addDeal = useCallback((deal) => {
    if (deal.pipelineId !== pipelineRef.current) return
    const isNew = !dealsRef.current.some((item) => item.id === deal.id)
    setDeals((current) => [deal, ...current.filter((item) => item.id !== deal.id)])
    if (isNew) setStageTotals((totals) => bump(totals, deal.stageId, 1))
  }, [])

  const updateDeal = useCallback((deal) => {
    if (deal.pipelineId !== pipelineRef.current) return
    const previous = dealsRef.current.find((item) => item.id === deal.id)
    setDeals((current) => current.map((item) => (item.id === deal.id ? deal : item)))
    if (previous && previous.stageId !== deal.stageId) {
      setStageTotals((totals) => bump(bump(totals, previous.stageId, -1), deal.stageId, 1))
    }
  }, [])

  const removeDeal = useCallback((dealId) => {
    const previous = dealsRef.current.find((item) => item.id === dealId)
    setDeals((current) => current.filter((item) => item.id !== dealId))
    if (previous) setStageTotals((totals) => bump(totals, previous.stageId, -1))
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
      setStageTotals((totals) => bump(bump(totals, deal.stageId, -1), stageId, 1))

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
        const shownStageId = dealsRef.current.find((item) => item.id === dealId)?.stageId
        setDeals((current) =>
          current.map((item) => (item.id === dealId ? { ...item, stageId: fallbackStageId } : item)),
        )
        if (shownStageId !== undefined && shownStageId !== fallbackStageId) {
          setStageTotals((totals) => bump(bump(totals, shownStageId, -1), fallbackStageId, 1))
        }
        setMoveError(err?.message || 'Unable to move deal.')
      }
    },
    [token],
  )

  return {
    deals,
    stageTotals,
    stageCursors,
    loadingStages,
    stageErrors,
    isLoading,
    isSearching,
    error,
    moveError,
    clearMoveError: () => setMoveError(''),
    reload,
    loadMore,
    addDeal,
    updateDeal,
    removeDeal,
    moveDeal,
  }
}
