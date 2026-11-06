import { useCallback, useEffect, useState } from 'react'
import { fetchCrmPipelines } from '../api.js'

/**
 * The CRM page's single source of truth for pipelines. Every view (selector,
 * board, Actions tab, pipeline modal, stage drawer) reads from this list and
 * writes through the helpers below, so they never drift apart.
 */
export default function useCrmPipelines(token) {
  const [pipelines, setPipelines] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    if (!token) return undefined
    let cancelled = false
    setIsLoading(true)
    setError('')
    fetchCrmPipelines(token)
      .then((list) => {
        if (!cancelled) setPipelines(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Unable to load pipelines.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, reloadTick])

  const reload = useCallback(() => setReloadTick((tick) => tick + 1), [])

  const addPipeline = useCallback((pipeline) => {
    setPipelines((current) => [...current.filter((item) => item.id !== pipeline.id), pipeline])
  }, [])

  const updatePipeline = useCallback((pipelineId, changes) => {
    setPipelines((current) =>
      current.map((item) => (item.id === pipelineId ? { ...item, ...changes } : item)),
    )
  }, [])

  const removePipeline = useCallback((pipelineId) => {
    setPipelines((current) => current.filter((item) => item.id !== pipelineId))
  }, [])

  return { pipelines, isLoading, error, reload, addPipeline, updatePipeline, removePipeline }
}
