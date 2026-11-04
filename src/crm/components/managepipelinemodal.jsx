import { useEffect, useRef, useState } from 'react'
import { LuCheck, LuPencil, LuSettings2, LuTrash2, LuX } from 'react-icons/lu'
import { createCrmPipeline, fetchCrmPipelines } from '../api.js'
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

export default function ManagePipelineModal({ open, token, onClose, onCreated, initialTab = 'manage' }) {
  const [activeTab, setActiveTab] = useState('manage')
  const [pipelines, setPipelines] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [reloadTick, setReloadTick] = useState(0)

  const [name, setName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].key)
  const [templateStages, setTemplateStages] = useState(
    Object.fromEntries(TEMPLATES.map((template) => [template.key, [...template.stages]])),
  )
  const [stageDraft, setStageDraft] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createStep, setCreateStep] = useState(1)
  const [draggedStageIndex, setDraggedStageIndex] = useState(null)
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
      return
    }
    setActiveTab(initialTab === 'create' ? 'create' : 'manage')
  }, [open, initialTab])

  if (!open) return null

  const addStage = (templateKey) => {
    const value = stageDraft.trim()
    if (!value) return
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
      setCreateStep(3)
      return
    }
    setIsCreating(true)
    setCreateError('')
    try {
      const created = await createCrmPipeline(token, {
        name: name.trim(),
        template: selectedTemplate,
        stages: templateStages[selectedTemplate] || [],
      })
      onCreated?.(created)
      setPipelines((current) => [created, ...current.filter((pipeline) => pipeline.id !== created.id)])
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
                <button
                  key={step}
                  type="button"
                  onClick={() => setCreateStep(step)}
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                    createStep === step
                      ? 'border-[#cc785c] bg-[#cc785c] text-white'
                      : 'border-[var(--ew-line)] bg-surface text-[var(--ew-muted)]'
                  }`}
                >
                  {step}
                </button>
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
                <ul className="space-y-2">
                  {pipelines.map((pipeline) => (
                    <li
                      key={pipeline.id}
                      className="flex items-center justify-between rounded-control border px-3 py-3"
                      style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
                    >
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-[var(--ew-ink)]">{pipeline.name}</h3>
                        <p className="text-xs text-[var(--ew-muted)]">
                          {Array.isArray(pipeline.stages)
                            ? `${pipeline.stages.length} stage${pipeline.stages.length === 1 ? '' : 's'}`
                            : 'Pipeline'}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Settings for ${pipeline.name}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs text-[var(--ew-muted)] transition-colors hover:bg-ground/70"
                      >
                        <LuSettings2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
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
                    <p className="text-xs text-[var(--ew-muted)]">Template</p>
                    <p className="text-sm font-semibold text-[var(--ew-ink)]">
                      {TEMPLATES.find((template) => template.key === selectedTemplate)?.title}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--ew-muted)]">Stages</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {(templateStages[selectedTemplate] || []).map((stage, index) => (
                        <span key={`${stage}-${index}`} className="rounded-xs bg-ground px-2 py-0.5 text-xs text-[var(--ew-ink)]">
                          {stage}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isCreating || !name.trim()}
                    className="h-9 rounded-xs bg-[#cc785c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60"
                  >
                    {isCreating ? 'Creating…' : 'Create pipeline'}
                  </button>
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
                {createStep < 3 && (
                  <button
                    type="button"
                    onClick={() => setCreateStep((step) => Math.min(3, step + 1))}
                    disabled={createStep === 1 && !name.trim()}
                    className="rounded-xs bg-[#cc785c] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-40"
                  >
                    Next
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
