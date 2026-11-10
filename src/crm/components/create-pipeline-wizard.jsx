import { useEffect, useState } from 'react'
import { LuCheck, LuPencil, LuTrash2 } from 'react-icons/lu'
import { createCrmPipeline, fetchCrmEligibleUsers } from '../api.js'
import { hasNameConflict, isSuperRole } from '../utils.js'
import InlineError from './inline-error.jsx'

const CREATE_STEPS = [1, 2, 3]
const LAST_STEP = CREATE_STEPS[CREATE_STEPS.length - 1]

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

const fieldClass =
  'h-9 rounded-xs border bg-surface px-3 text-sm text-[var(--ew-ink)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'
const fieldStyle = { borderColor: 'var(--ew-field-line)' }

/** Numbered step markers shown in the drawer header while creating. */
export function StepIndicator({ step }) {
  return (
    <div className="relative flex w-2/5 shrink-0 items-center justify-between gap-2 px-2">
      <div className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-[var(--ew-line)]" />
      {CREATE_STEPS.map((item) => (
        <div
          key={item}
          aria-current={step === item ? 'step' : undefined}
          className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
            step === item
              ? 'border-[#cc785c] bg-[#cc785c] text-white'
              : 'border-[var(--ew-line)] bg-surface text-[var(--ew-muted)]'
          }`}
        >
          {item}
        </div>
      ))}
    </div>
  )
}

function TemplatePicker({ selected, templateStages, onSelect }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {TEMPLATES.map((template) => (
        <button
          key={template.key}
          type="button"
          onClick={() => onSelect(template.key)}
          className={`rounded-control border p-3 text-left transition-colors ${
            selected === template.key ? 'border-[#cc785c] bg-[#cc785c]/5' : 'border-[var(--ew-line)]'
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
      ))}
    </div>
  )
}

/** Step 2: add, rename, remove, and drag-reorder the template's stages. */
function StageEditor({ stages, onChange, onError }) {
  const [draft, setDraft] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [draggedIndex, setDraggedIndex] = useState(null)

  const addStage = () => {
    const value = draft.trim()
    if (!value) return
    if (hasNameConflict(stages, value)) {
      onError(`Stage "${value}" already exists.`)
      return
    }
    onError('')
    onChange([...stages, value])
    setDraft('')
  }

  const saveEdit = (index) => {
    const value = editDraft.trim()
    if (!value) return
    if (hasNameConflict(stages, value, index)) {
      onError(`Stage "${value}" already exists.`)
      return
    }
    onError('')
    onChange(stages.map((stage, i) => (i === index ? value : stage)))
    setEditingIndex(null)
    setEditDraft('')
  }

  const moveStage = (from, to) => {
    if (from === null || from === to) return
    const next = [...stages]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  return (
    <>
      <div className="flex w-3/5 shrink-0 gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addStage()
            }
          }}
          placeholder="Add stage"
          maxLength={100}
          className={`${fieldClass} flex-1`}
          style={fieldStyle}
        />
        <button type="button" onClick={addStage} className="h-9 rounded-xs bg-[#cc785c] px-4 text-sm font-medium text-white">
          Add
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-[var(--ew-muted)]">Drag to reorder stages or edit below.</p>
        <ul className="grid max-h-32 grid-cols-2 gap-1 overflow-y-auto pr-1">
          {stages.map((stage, index) => (
            <li
              key={`${stage}-${index}`}
              draggable
              onDragStart={() => setDraggedIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                moveStage(draggedIndex, index)
                setDraggedIndex(null)
              }}
              onDragEnd={() => setDraggedIndex(null)}
              className="flex cursor-grab items-center gap-2 rounded-control border bg-ground px-3 py-2 active:cursor-grabbing"
              style={{ borderColor: 'var(--ew-line)' }}
            >
              {editingIndex === index ? (
                <input
                  type="text"
                  value={editDraft}
                  maxLength={100}
                  onChange={(event) => setEditDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      saveEdit(index)
                    }
                    if (event.key === 'Escape') {
                      setEditingIndex(null)
                      setEditDraft('')
                    }
                  }}
                  autoFocus
                  className="min-w-0 flex-1 rounded-xs border bg-surface px-2 py-1 text-sm text-[var(--ew-ink)] outline-none focus:border-accent"
                  style={fieldStyle}
                />
              ) : (
                <span className="min-w-0 flex-1 truncate text-sm text-[var(--ew-ink)]">{stage}</span>
              )}
              <div className="flex shrink-0 items-center gap-1">
                {editingIndex === index ? (
                  <button
                    type="button"
                    onClick={() => saveEdit(index)}
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
                      setEditingIndex(index)
                      setEditDraft(stage)
                    }}
                    className="text-[var(--ew-muted)] transition-colors hover:text-[#cc785c]"
                  >
                    <LuPencil className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Delete ${stage}`}
                  onClick={() => onChange(stages.filter((_, i) => i !== index))}
                  className="text-[var(--ew-muted)] transition-colors hover:text-danger"
                >
                  <LuTrash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

/** Step 3: choose who else can see the pipeline. */
function AllowedUsersPicker({
  users,
  currentUserId,
  selectedIds,
  onChange,
  isLoading,
  error,
  onRetry,
}) {
  return (
    <div className="space-y-3 rounded-control border p-4" style={{ borderColor: 'var(--ew-line)' }}>
      <div>
        <p className="text-xs text-[var(--ew-muted)]">Allowed users</p>
        <p className="mt-1 text-xs text-[var(--ew-muted)]">
          Superadmins always retain access. Pipeline creator is included automatically.
        </p>
        <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
          {isLoading ? (
            <p role="status" className="py-4 text-center text-sm text-[var(--ew-muted)]">
              Checking CRM access...
            </p>
          ) : error ? (
            <div className="py-3 text-center" role="alert">
              <p className="text-sm text-danger">{error}</p>
              <button type="button" onClick={onRetry} className="mt-2 text-xs font-medium underline">
                Retry
              </button>
            </div>
          ) : users.length === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--ew-muted)]">
              No active users have CRM menu access.
            </p>
          ) : (
            users.map((candidate) => {
              const isSuper = isSuperRole(candidate.role)
              const isCreator = candidate.id === currentUserId
              return (
                <label key={candidate.id} className="flex items-center gap-2 rounded-xs px-1 py-1 text-sm text-[var(--ew-ink)]">
                  <input
                    type="checkbox"
                    checked={isSuper || isCreator || selectedIds.includes(candidate.id)}
                    disabled={isSuper || isCreator}
                    onChange={(event) =>
                      onChange(
                        event.target.checked
                          ? [...new Set([...selectedIds, candidate.id])]
                          : selectedIds.filter((id) => id !== candidate.id),
                      )
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {candidate.username} ({candidate.role})
                  </span>
                </label>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Create tab of the pipeline drawer: name + template, stages, allowed users.
 * The drawer owns `step` so it can show the step markers in its header.
 */
export default function CreatePipelineWizard({ token, user, step, onStepChange, onBusyChange, onCreated }) {
  const [name, setName] = useState('')
  const [template, setTemplate] = useState(TEMPLATES[0].key)
  const [templateStages, setTemplateStages] = useState(defaultTemplateStages)
  const [users, setUsers] = useState([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [usersError, setUsersError] = useState('')
  const [usersReloadTick, setUsersReloadTick] = useState(0)
  const [allowedUserIds, setAllowedUserIds] = useState([])
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (step !== LAST_STEP || !token) return undefined
    let cancelled = false
    setUsers([])
    setIsLoadingUsers(true)
    setUsersError('')
    fetchCrmEligibleUsers(token)
      .then((list) => {
        if (!cancelled) {
          const eligibleUsers = Array.isArray(list) ? list : []
          const eligibleIds = new Set(eligibleUsers.map((candidate) => candidate.id))
          setUsers(eligibleUsers)
          setAllowedUserIds((current) => current.filter((id) => eligibleIds.has(id)))
        }
      })
      .catch((err) => {
        if (!cancelled) setUsersError(err?.message || 'Unable to verify CRM menu access.')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingUsers(false)
      })
    return () => {
      cancelled = true
    }
  }, [step, token, usersReloadTick])

  const stages = templateStages[template] || []
  const canAdvance = step === 1 ? Boolean(name.trim()) : stages.length > 0

  const setStages = (next) => setTemplateStages((current) => ({ ...current, [template]: next }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Pipeline name is required.')
      onStepChange(1)
      return
    }
    // Pressing Enter in the name field submits the form implicitly; only the
    // last step may actually create the pipeline.
    if (step < LAST_STEP) {
      if (canAdvance) onStepChange(step + 1)
      return
    }
    if (stages.length === 0) {
      setError('Add at least one stage.')
      onStepChange(2)
      return
    }
    if (isLoadingUsers || usersError) {
      setError('Verify CRM menu access before creating the pipeline.')
      return
    }
    setIsCreating(true)
    onBusyChange?.(true)
    setError('')
    try {
      const created = await createCrmPipeline(token, {
        name: name.trim(),
        stages,
        allowedUserIds: [...new Set([user?.id, ...allowedUserIds].filter(Boolean))],
      })
      onCreated(created)
    } catch (err) {
      setError(err?.message || 'Unable to create pipeline.')
    } finally {
      setIsCreating(false)
      onBusyChange?.(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {step === 1 && (
        <>
          <label className="block w-3/5 shrink-0">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter pipeline name"
              maxLength={100}
              className={`${fieldClass} w-full`}
              style={fieldStyle}
            />
          </label>
          <TemplatePicker selected={template} templateStages={templateStages} onSelect={setTemplate} />
        </>
      )}

      {step === 2 && <StageEditor stages={stages} onChange={setStages} onError={setError} />}

      {step === 3 && (
        <AllowedUsersPicker
          users={users}
          currentUserId={user?.id}
          selectedIds={allowedUserIds}
          onChange={setAllowedUserIds}
          isLoading={isLoadingUsers}
          error={usersError}
          onRetry={() => setUsersReloadTick((tick) => tick + 1)}
        />
      )}

      <InlineError>{error}</InlineError>

      <div className="flex justify-between gap-2">
        <button
          type="button"
          onClick={() => onStepChange(Math.max(1, step - 1))}
          disabled={step === 1}
          className="rounded-xs border bg-ground px-4 py-2 text-sm font-medium text-[var(--ew-muted)] disabled:opacity-40"
          style={{ borderColor: 'var(--ew-line)' }}
        >
          Previous
        </button>
        {/* Distinct keys so React never turns the clicked Next button into the
            submit button mid-click, which would submit the form on step change. */}
        {step === LAST_STEP ? (
          <button
            key="create"
            type="submit"
            disabled={isCreating || isLoadingUsers || Boolean(usersError) || !name.trim()}
            className="h-9 rounded-xs bg-[#cc785c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60"
          >
            {isCreating ? 'Creating...' : 'Create pipeline'}
          </button>
        ) : (
          <button
            key="next"
            type="button"
            onClick={() => onStepChange(step + 1)}
            disabled={!canAdvance}
            className="rounded-xs bg-[#cc785c] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-40"
          >
            Next
          </button>
        )}
      </div>
    </form>
  )
}
