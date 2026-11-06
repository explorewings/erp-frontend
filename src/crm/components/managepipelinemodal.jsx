import { useEffect, useRef, useState } from 'react'
import { LuCheck, LuPencil, LuTrash2, LuX } from 'react-icons/lu'
import {
  createCrmPipeline,
  deleteCrmPipeline,
  fetchCrmPipelineDeleteImpact,
  fetchCrmPipelines,
  fetchCrmUsers,
  renameCrmPipeline,
} from '../api.js'
import Loader from '../../appcomponents/loader.jsx'

const TABS = [
  { id: 'manage', label: 'Manage' },
  { id: 'create', label: 'Create' },
]

const TEMPLATES = [
  {
    key: 'sales',
    title: 'Sales',
    description: 'Classic sales funnel with lead, qualification, proposal, and closing stages.',
    stages: ['Lead In', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'],
  },
  {
    key: 'client',
    title: 'Client',
    description: 'Pipeline for lifecycle and service handling of existing clients.',
    stages: ['Onboarding', 'Verification', 'Active', 'Renewal', 'Closed'],
  },
]

const defaultTemplateStages = () =>
  Object.fromEntries(TEMPLATES.map((template) => [template.key, [...template.stages]]))

const hasStageNamed = (stages, value, ignoreIndex = -1) => {
  const key = value.toLocaleLowerCase()
  return stages.some((stage, index) => index !== ignoreIndex && stage.toLocaleLowerCase() === key)
}

function TabBar({ activeTab, onTabChange, tabRefs, sliderStyle }) {
  return (
    <div
      className="relative inline-flex rounded-lg border p-1"
      role="tablist"
      aria-label="Pipeline management views"
      style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
    >
      <div
        className="absolute inset-y-1 rounded-xs bg-[#cc785c] transition-all duration-300 ease-out"
        style={{ left: sliderStyle.left, width: sliderStyle.width }}
      />
      {TABS.map((tab, index) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            ref={(node) => {
              tabRefs.current[index] = node
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={`relative z-10 whitespace-nowrap rounded-xs px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
              isActive ? 'text-white' : 'text-[var(--ew-muted)]'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

export default function ManagePipelineModal({
  open,
  token,
  user,
  onClose,
  onCreated,
  onRenamed,
  onDeleted,
  initialTab = 'manage',
}) {
  const [activeTab, setActiveTab] = useState('manage')
  const [pipelines, setPipelines] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [reloadTick, setReloadTick] = useState(0)

  // Manage tab: inline rename
  const [renamingId, setRenamingId] = useState(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [isSavingRename, setIsSavingRename] = useState(false)
  const [manageError, setManageError] = useState('')

  // Manage tab: delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deletePanelId, setDeletePanelId] = useState(null)
  const impactRequestRef = useRef(0)
  const [deleteImpact, setDeleteImpact] = useState(null)
  const [isLoadingImpact, setIsLoadingImpact] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const [name, setName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].key)
  const [templateStages, setTemplateStages] = useState(defaultTemplateStages)
  const [stageDraft, setStageDraft] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createStep, setCreateStep] = useState(1)
  const [draggedStageIndex, setDraggedStageIndex] = useState(null)
  const [availableUsers, setAvailableUsers] = useState([])
  const [allowedUserIds, setAllowedUserIds] = useState([])
  const [editingStageIndex, setEditingStageIndex] = useState(null)
  const [stageEditDraft, setStageEditDraft] = useState('')

  const tabRefs = useRef([])
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 })

  useEffect(() => {
    if (!open) return undefined
    const update = () => {
      const index = TABS.findIndex((tab) => tab.id === activeTab)
      const node = tabRefs.current[index]
      if (!node) return
      setSliderStyle({ left: node.offsetLeft, width: node.offsetWidth })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [activeTab, open])

  useEffect(() => {
    if (!open || !token) return undefined
    let cancelled = false
    setIsLoading(true)
    setLoadError('')
    fetchCrmUsers(token)
      .then((result) => {
        if (cancelled) return
        const users = Array.isArray(result) ? result : result?.items || []
        setAvailableUsers(users)
      })
      .catch(() => {
        if (!cancelled) setAvailableUsers([])
      })
    fetchCrmPipelines(token)
      .then((result) => {
        if (cancelled) return
        setPipelines(Array.isArray(result) ? result : result?.items || [])
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(error?.message || 'Unable to load pipelines.')
        setPipelines([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, token, reloadTick])

  useEffect(() => {
    if (!open) {
      setActiveTab('manage')
      setName('')
      setCreateError('')
      setStageDraft('')
      setCreateStep(1)
      setDraggedStageIndex(null)
      setAllowedUserIds([])
      setTemplateStages(defaultTemplateStages())
      setRenamingId(null)
      setRenameDraft('')
      setManageError('')
      setDeleteTarget(null)
      setDeletePanelId(null)
      setDeleteImpact(null)
      setDeleteError('')
      setEditingStageIndex(null)
      setStageEditDraft('')
      return
    }
    setActiveTab(initialTab === 'create' ? 'create' : 'manage')
    if (user?.id) setAllowedUserIds([user.id])
  }, [open, initialTab])

  if (!open) return null

  const stageCount = (templateStages[selectedTemplate] || []).length

  const startRename = (pipeline) => {
    setRenamingId(pipeline.id)
    setRenameDraft(pipeline.name)
    setManageError('')
  }

  const cancelRename = () => {
    setRenamingId(null)
    setRenameDraft('')
  }

  const saveRename = async () => {
    const pipeline = pipelines.find((item) => item.id === renamingId)
    if (!pipeline) return
    const nextName = renameDraft.trim()
    if (!nextName) {
      setManageError('Pipeline name is required.')
      return
    }
    if (nextName === pipeline.name) {
      cancelRename()
      return
    }
    setIsSavingRename(true)
    setManageError('')
    try {
      const updated = await renameCrmPipeline(token, pipeline.id, nextName)
      setPipelines((current) =>
        current.map((item) => (item.id === updated.id ? { ...item, name: updated.name } : item)),
      )
      onRenamed?.(updated)
      cancelRename()
    } catch (error) {
      setManageError(error?.message || 'Unable to rename pipeline.')
    } finally {
      setIsSavingRename(false)
    }
  }

  const openDeleteConfirm = async (pipeline) => {
    if (deleteTarget?.id === pipeline.id) {
      closeDeleteConfirm()
      return
    }
    setDeleteTarget(pipeline)
    setDeletePanelId(pipeline.id)
    setDeleteImpact(null)
    setDeleteError('')
    setIsLoadingImpact(true)
    // Ignore a slow response for a pipeline that is no longer the one being confirmed.
    const requestId = ++impactRequestRef.current
    try {
      const impact = await fetchCrmPipelineDeleteImpact(token, pipeline.id)
      if (requestId === impactRequestRef.current) setDeleteImpact(impact)
    } catch (error) {
      if (requestId === impactRequestRef.current) {
        setDeleteError(error?.message || 'Unable to load what will be deleted.')
      }
    } finally {
      if (requestId === impactRequestRef.current) setIsLoadingImpact(false)
    }
  }

  const closeDeleteConfirm = () => {
    if (isDeleting) return
    setDeleteTarget(null)
    setDeleteError('')
  }

  const confirmDelete = async () => {
    if (!deleteTarget || !deleteImpact) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      await deleteCrmPipeline(token, deleteTarget.id)
      setPipelines((current) => current.filter((item) => item.id !== deleteTarget.id))
      onDeleted?.(deleteTarget.id)
      setDeleteTarget(null)
      setDeleteImpact(null)
    } catch (error) {
      setDeleteError(error?.message || 'Unable to delete pipeline.')
    } finally {
      setIsDeleting(false)
    }
  }

  const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`
  const describeDelete = (pipeline) => {
    if (isLoadingImpact) return 'Checking what this pipeline contains...'
    if (!deleteImpact) return 'This pipeline could not be checked, so it cannot be deleted right now.'
    return (
      `This permanently deletes the pipeline with its ${plural(deleteImpact.stageCount, 'stage')}` +
      (deleteImpact.dealCount > 0
        ? ` and ${plural(deleteImpact.dealCount, 'deal')}. The clients stay in Clients.`
        : '. It has no deals.') +
      ' This cannot be undone.'
    )
  }

  const addStage = (templateKey) => {
    const value = stageDraft.trim()
    if (!value) return
    if (hasStageNamed(templateStages[templateKey] || [], value)) {
      setCreateError(`Stage "${value}" already exists.`)
      return
    }
    setCreateError('')
    setTemplateStages((current) => ({
      ...current,
      [templateKey]: [...(current[templateKey] || []), value],
    }))
    setStageDraft('')
  }

  const removeStage = (templateKey, index) => {
    setTemplateStages((current) => ({
      ...current,
      [templateKey]: (current[templateKey] || []).filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const saveStageEdit = (templateKey, index) => {
    const value = stageEditDraft.trim()
    if (!value) return
    if (hasStageNamed(templateStages[templateKey] || [], value, index)) {
      setCreateError(`Stage "${value}" already exists.`)
      return
    }
    setCreateError('')
    setTemplateStages((current) => {
      const stages = [...(current[templateKey] || [])]
      stages[index] = value
      return { ...current, [templateKey]: stages }
    })
    setEditingStageIndex(null)
    setStageEditDraft('')
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!name.trim()) {
      setCreateError('Pipeline name is required.')
      setCreateStep(1)
      return
    }
    // Pressing Enter in the name field submits the form implicitly; only the
    // final step may actually create the pipeline.
    if (createStep < 3) {
      if (createStep === 2 && stageCount === 0) return
      setCreateStep((step) => Math.min(3, step + 1))
      return
    }
    if (stageCount === 0) {
      setCreateError('Add at least one stage.')
      setCreateStep(2)
      return
    }
    setIsCreating(true)
    setCreateError('')
    try {
      const created = await createCrmPipeline(token, {
        name: name.trim(),
        template: selectedTemplate,
        stages: templateStages[selectedTemplate] || [],
        allowedUserIds,
      })
      onCreated?.(created)
      setPipelines((current) => [...current.filter((pipeline) => pipeline.id !== created.id), created])
      setName('')
      setCreateStep(1)
      setActiveTab('manage')
      setReloadTick((value) => value + 1)
    } catch (error) {
      setCreateError(error?.message || 'Unable to create pipeline.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 backdrop-blur-sm"
        aria-label="Close pipeline manager"
        onClick={() => {
          if (!isCreating) onClose?.()
        }}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pipeline-manager-title"
        className="relative flex max-h-[90vh] w-full max-w-[40rem] flex-col rounded-control border bg-surface shadow-2xl"
        style={{ borderColor: 'var(--ew-line)' }}
      >
        <header className="flex items-start justify-between gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--ew-line)' }}>
          <div>
            <h2 id="pipeline-manager-title" className="text-sm font-semibold text-[var(--ew-ink)]">
              Manage pipelines
            </h2>
            <p className="mt-1 text-xs text-[var(--ew-muted)]">
              Create and manage the pipelines used by your CRM board.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close pipeline manager"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs text-[var(--ew-muted)] hover:bg-ground/70"
          >
            <LuX className="h-4 w-4" />
          </button>
        </header>

        <div className="flex items-center justify-between gap-4 border-b px-5 py-3" style={{ borderColor: 'var(--ew-line)' }}>
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} tabRefs={tabRefs} sliderStyle={sliderStyle} />
          {activeTab === 'create' ? (
            <div className="relative flex w-2/5 shrink-0 items-center justify-between gap-2 px-2">
              <div className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-[var(--ew-line)]" />
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  aria-current={createStep === step ? 'step' : undefined}
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
                    createStep === step
                      ? 'border-[#cc785c] bg-[#cc785c] text-white'
                      : 'border-[var(--ew-line)] bg-surface text-[var(--ew-muted)]'
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {activeTab === 'manage' ? (
            <div>
              {isLoading ? (
                <div className="flex min-h-40 items-center justify-center">
                  <Loader size={1.8} />
                </div>
              ) : loadError ? (
                <div className="rounded-control border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                  {loadError}
                  <button
                    type="button"
                    onClick={() => setReloadTick((value) => value + 1)}
                    className="ml-2 font-medium underline"
                  >
                    Retry
                  </button>
                </div>
              ) : pipelines.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center rounded-control border border-dashed text-center" style={{ borderColor: 'var(--ew-line)' }}>
                  <p className="text-sm font-semibold text-[var(--ew-ink)]">No pipelines yet</p>
                  <p className="mt-1 text-xs text-[var(--ew-muted)]">Switch to Create to make your first pipeline.</p>
                </div>
              ) : (
                <ul className="min-h-40 space-y-2">
                  {pipelines.map((pipeline) => (
                    <li
                      key={pipeline.id}
                      className="rounded-control border px-3 py-3 transition-colors"
                      style={{
                        borderColor: deleteTarget?.id === pipeline.id ? 'rgba(220, 38, 38, 0.35)' : 'var(--ew-line)',
                        background: 'var(--ew-surface)',
                      }}
                    >
                      <div
                        className={`flex justify-between ${
                          renamingId === pipeline.id ? 'items-start' : 'items-center'
                        }`}
                      >
                      <div className="min-w-0 flex-1">
                        {renamingId === pipeline.id ? (
                          <input
                            type="text"
                            value={renameDraft}
                            maxLength={100}
                            autoFocus
                            disabled={isSavingRename}
                            aria-label={`New name for ${pipeline.name}`}
                            onChange={(event) => setRenameDraft(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                saveRename()
                              }
                              if (event.key === 'Escape') {
                                event.preventDefault()
                                cancelRename()
                              }
                            }}
                            className="h-8 w-full rounded-xs border bg-surface px-2 text-sm text-[var(--ew-ink)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                            style={{ borderColor: 'var(--ew-field-line)' }}
                          />
                        ) : (
                          <h3 className="truncate text-sm font-semibold text-[var(--ew-ink)]" title={pipeline.name}>
                            {pipeline.name}
                          </h3>
                        )}
                        <p className="text-xs text-[var(--ew-muted)]">
                          {Array.isArray(pipeline.stages)
                            ? `${pipeline.stages.length} stage${pipeline.stages.length === 1 ? '' : 's'}`
                            : 'Pipeline'}
                        </p>
                      </div>
                      {pipeline.canManage ? (
                        <div className="ml-3 flex shrink-0 items-center gap-1">
                          {renamingId === pipeline.id ? (
                            <>
                              <button
                                type="button"
                                onClick={saveRename}
                                disabled={isSavingRename}
                                aria-label="Save pipeline name"
                                className="flex h-8 w-8 items-center justify-center rounded-xs border border-[#cc785c] text-[#cc785c] transition-colors hover:bg-[#cc785c]/10 disabled:opacity-60"
                              >
                                <LuCheck className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelRename}
                                disabled={isSavingRename}
                                aria-label="Cancel rename"
                                className="flex h-8 w-8 items-center justify-center rounded-xs border text-[var(--ew-muted)] transition-colors hover:text-[var(--ew-ink)] disabled:opacity-60"
                                style={{ borderColor: 'var(--ew-line)' }}
                              >
                                <LuX className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startRename(pipeline)}
                                disabled={renamingId !== null || deleteTarget !== null}
                                aria-label={`Rename ${pipeline.name}`}
                                className="flex h-8 w-8 items-center justify-center rounded-xs text-[var(--ew-muted)] transition-colors hover:bg-ground/70 hover:text-[#cc785c] disabled:opacity-40"
                              >
                                <LuPencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteConfirm(pipeline)}
                                disabled={renamingId !== null || isDeleting}
                                aria-label={`Delete ${pipeline.name}`}
                                aria-expanded={deleteTarget?.id === pipeline.id}
                                aria-controls={`pipeline-delete-${pipeline.id}`}
                                className={`flex h-8 w-8 items-center justify-center rounded-xs transition-colors hover:bg-ground/70 hover:text-danger disabled:opacity-40 ${
                                  deleteTarget?.id === pipeline.id ? 'bg-danger/10 text-danger' : 'text-[var(--ew-muted)]'
                                }`}
                              >
                                <LuTrash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      ) : null}
                      </div>

                      {pipeline.canManage ? (
                        <div
                          id={`pipeline-delete-${pipeline.id}`}
                          aria-hidden={deleteTarget?.id !== pipeline.id}
                          className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                            deleteTarget?.id === pipeline.id ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                          }`}
                        >
                          <div className="min-h-0 overflow-hidden">
                            {deletePanelId === pipeline.id ? (
                              <div
                                role="region"
                                aria-label={`Delete ${pipeline.name}`}
                                className="mt-3 rounded-xs border border-danger/30 bg-danger/5 px-3 py-3"
                              >
                                <p className="text-sm font-semibold text-danger">Delete this pipeline?</p>
                                <p className="mt-1 text-xs leading-relaxed text-[var(--ew-muted)]">
                                  {describeDelete(pipeline)}
                                </p>
                                {deleteError && (
                                  <p role="alert" className="mt-2 text-xs font-medium text-danger">
                                    {deleteError}
                                  </p>
                                )}
                                <div className="mt-3 flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={closeDeleteConfirm}
                                    disabled={isDeleting || deleteTarget?.id !== pipeline.id}
                                    className="rounded-xs border bg-surface px-3 py-1.5 text-xs font-medium text-[var(--ew-muted)] transition-colors hover:text-[var(--ew-ink)] disabled:opacity-60"
                                    style={{ borderColor: 'var(--ew-line)' }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={confirmDelete}
                                    disabled={
                                      isDeleting ||
                                      isLoadingImpact ||
                                      !deleteImpact ||
                                      deleteTarget?.id !== pipeline.id
                                    }
                                    className="rounded-xs bg-danger px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-danger-strong disabled:opacity-60"
                                  >
                                    {isDeleting ? 'Deleting...' : 'Delete pipeline'}
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {manageError && (
                <div className="mt-3 rounded-control border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                  {manageError}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              {createStep === 1 ? (
                <label className="block w-3/5 shrink-0">
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Enter pipeline name"
                    maxLength={100}
                    className="h-9 w-full rounded-xs border bg-surface px-3 text-sm text-[var(--ew-ink)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    style={{ borderColor: 'var(--ew-field-line)' }}
                  />
                </label>
              ) : createStep === 2 ? (
                <div className="flex w-3/5 shrink-0 gap-2">
                  <input
                    type="text"
                    value={stageDraft}
                    onChange={(event) => setStageDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        addStage(selectedTemplate)
                      }
                    }}
                    placeholder="Add stage"
                    className="h-9 flex-1 rounded-xs border bg-surface px-3 text-sm text-[var(--ew-ink)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    style={{ borderColor: 'var(--ew-field-line)' }}
                  />
                  <button
                    type="button"
                    onClick={() => addStage(selectedTemplate)}
                    className="h-9 rounded-xs bg-[#cc785c] px-4 text-sm font-medium text-white"
                  >
                    Add
                  </button>
                </div>
              ) : null}

              {createStep === 1 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {TEMPLATES.map((template) => {
                    const isActive = selectedTemplate === template.key
                    return (
                      <button
                        key={template.key}
                        type="button"
                        onClick={() => setSelectedTemplate(template.key)}
                        className={`rounded-control border p-3 text-left transition-colors ${
                          isActive ? 'border-[#cc785c] bg-[#cc785c]/5' : 'border-[var(--ew-line)]'
                        }`}
                      >
                        <h3 className="text-sm font-semibold text-[var(--ew-ink)]">{template.title}</h3>
                        <p className="mt-1 text-xs text-[var(--ew-muted)]">{template.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(templateStages[template.key] || []).map((stage, index) => (
                            <span key={`${stage}-${index}`} className="rounded-xs bg-ground px-2 py-0.5 text-xs text-[var(--ew-ink)]">
                              {stage}
                            </span>
                          ))}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {createStep === 2 && (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--ew-muted)]">Drag to reorder stages or edit below.</p>
                  <ul className="grid max-h-32 grid-cols-2 gap-1 overflow-y-auto pr-1">
                    {(templateStages[selectedTemplate] || []).map((stage, index) => (
                      <li
                        key={`${stage}-${index}`}
                        draggable
                        onDragStart={() => setDraggedStageIndex(index)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (draggedStageIndex === null || draggedStageIndex === index) return
                          setTemplateStages((current) => {
                            const stages = [...(current[selectedTemplate] || [])]
                            const [moved] = stages.splice(draggedStageIndex, 1)
                            stages.splice(index, 0, moved)
                            return { ...current, [selectedTemplate]: stages }
                          })
                          setDraggedStageIndex(null)
                        }}
                        onDragEnd={() => setDraggedStageIndex(null)}
                        className="flex cursor-grab items-center gap-2 rounded-control border bg-ground px-3 py-2 active:cursor-grabbing"
                        style={{ borderColor: 'var(--ew-line)' }}
                      >
                        {editingStageIndex === index ? (
                          <input
                            type="text"
                            value={stageEditDraft}
                            onChange={(event) => setStageEditDraft(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                saveStageEdit(selectedTemplate, index)
                              }
                              if (event.key === 'Escape') {
                                setEditingStageIndex(null)
                                setStageEditDraft('')
                              }
                            }}
                            autoFocus
                            className="min-w-0 flex-1 rounded-xs border bg-surface px-2 py-1 text-sm text-[var(--ew-ink)] outline-none focus:border-accent"
                            style={{ borderColor: 'var(--ew-field-line)' }}
                          />
                        ) : (
                          <span className="min-w-0 flex-1 truncate text-sm text-[var(--ew-ink)]">{stage}</span>
                        )}
                        <div className="flex shrink-0 items-center gap-1">
                          {editingStageIndex === index ? (
                            <button
                              type="button"
                              onClick={() => saveStageEdit(selectedTemplate, index)}
                              aria-label="Save stage name"
                              className="flex h-6 w-6 items-center justify-center rounded-xs border border-[#cc785c] text-[#cc785c] transition-colors hover:bg-[#cc785c]/10"
                            >
                              <LuCheck className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              aria-label={`Edit ${stage}`}
                              onClick={() => {
                                setEditingStageIndex(index)
                                setStageEditDraft(stage)
                              }}
                              className="text-[var(--ew-muted)] transition-colors hover:text-[#cc785c]"
                            >
                              <LuPencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label={`Delete ${stage}`}
                            onClick={() => removeStage(selectedTemplate, index)}
                            className="text-[var(--ew-muted)] transition-colors hover:text-danger"
                          >
                            <LuTrash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {createStep === 3 && (
                <div className="space-y-3 rounded-control border p-4" style={{ borderColor: 'var(--ew-line)' }}>
                  <div>
                    <p className="text-xs text-[var(--ew-muted)]">Allowed users</p>
                    <p className="mt-1 text-xs text-[var(--ew-muted)]">
                      Superadmins always retain access. Pipeline creator is included automatically.
                    </p>
                    <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
                      {availableUsers
                        .filter((candidate) => candidate.status !== 'inactive')
                        .map((candidate) => {
                          const isSuper = candidate.role === 'superadmin' || candidate.role === 'superuser'
                          const isCreator = candidate.id === user?.id
                          const checked = allowedUserIds.includes(candidate.id) || isSuper
                          const disabled = isSuper || isCreator
                          return (
                            <label
                              key={candidate.id}
                              className="flex items-center gap-2 rounded-xs px-1 py-1 text-sm text-[var(--ew-ink)]"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                onChange={(event) => {
                                  setAllowedUserIds((current) => {
                                    if (event.target.checked) return [...new Set([...current, candidate.id])]
                                    return current.filter((id) => id !== candidate.id)
                                  })
                                }}
                              />
                              <span className="min-w-0 flex-1 truncate">
                                {candidate.username} ({candidate.role})
                              </span>
                            </label>
                          )
                        })}
                    </div>
                  </div>
                </div>
              )}

              {createError && (
                <div className="rounded-control border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                  {createError}
                </div>
              )}

              <div className="flex justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setCreateStep((step) => Math.max(1, step - 1))}
                  disabled={createStep === 1}
                  className="rounded-xs border bg-ground px-4 py-2 text-sm font-medium text-[var(--ew-muted)] disabled:opacity-40"
                  style={{ borderColor: 'var(--ew-line)' }}
                >
                  Previous
                </button>
                <div className="flex gap-2">
                  {createStep === 3 && (
                    <button
                      type="submit"
                      disabled={isCreating || !name.trim()}
                      className="h-9 rounded-xs bg-[#cc785c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60"
                    >
                      {isCreating ? 'Creating...' : 'Create pipeline'}
                    </button>
                  )}
                  {createStep < 3 && (
                    <button
                      type="button"
                      onClick={() => setCreateStep((step) => Math.min(3, step + 1))}
                      disabled={(createStep === 1 && !name.trim()) || (createStep === 2 && stageCount === 0)}
                      className="rounded-xs bg-[#cc785c] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-40"
                    >
                      Next
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
