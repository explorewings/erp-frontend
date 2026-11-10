import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FaUserPen } from 'react-icons/fa6'
import {
  LuCalendar,
  LuChevronDown,
  LuChevronUp,
  LuCheck,
  LuCopy,
  LuLayers,
  LuPencil,
  LuPlus,
  LuTrash2,
  LuUser,
  LuX,
} from 'react-icons/lu'
import { MdKeyboardDoubleArrowRight } from 'react-icons/md'
import DrawerBackdrop from '../../appcomponents/drawer-backdrop.jsx'
import Alert from '../../appcomponents/alert.jsx'
import Toast from '../../appcomponents/toast.jsx'
import { updateClient } from '../../clients/api.js'
import { buildClientPayload, MAX_CUSTOM_FIELDS } from '../../clients/client-form.js'
import { assignCrmDeal, deleteCrmDeal, fetchCrmAssignees } from '../api.js'

const slideEase = 'cubic-bezier(0.16, 1, 0.3, 1)'

const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function Field({ label, children, copyValue }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    if (!copyValue) return
    try {
      await navigator.clipboard.writeText(copyValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // Clipboard API can be blocked; the value is still visible to copy manually.
    }
  }
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-medium text-[var(--ew-muted)]">{label}</dt>
        <dd className="mt-0.5 break-words text-sm leading-5 text-[var(--ew-ink)]">{children}</dd>
      </div>
      {copyValue ? (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${label.toLowerCase()}`}
          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-none border border-[var(--ew-line)] text-[var(--ew-muted)] transition-colors hover:bg-[var(--ew-ground)] hover:text-[var(--ew-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ew-accent)]"
        >
          {copied ? (
            <LuCheck className="h-3.5 w-3.5 text-[#b76c4f]" aria-hidden="true" />
          ) : (
            <LuCopy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      ) : null}
    </div>
  )
}
export default function DealDetailsDrawer({
  open,
  token,
  deal,
  pipeline,
  stages = [],
  onClose,
  onDealUpdated,
  onDeleted,
}) {
  const [visible, setVisible] = useState(false)
  const [additionalOpen, setAdditionalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', email: '', phoneNumber: '' })
  const [editCustomFields, setEditCustomFields] = useState([])
  const [editError, setEditError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [assignees, setAssignees] = useState([])
  const [isLoadingAssignees, setIsLoadingAssignees] = useState(false)
  const [assigneeLoadError, setAssigneeLoadError] = useState('')
  const [assigneesReloadTick, setAssigneesReloadTick] = useState(0)
  const [isAssigning, setIsAssigning] = useState(false)
  const [assignmentError, setAssignmentError] = useState('')
  const [assignmentToast, setAssignmentToast] = useState(null)
  const [isAssigneeMenuOpen, setIsAssigneeMenuOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const onCloseRef = useRef(onClose)
  const assigneeMenuRef = useRef(null)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const requestClose = () => {
    if (isEditing || isSaving || isDeleting) return
    if (window.history.state?.overlay) {
      window.history.back()
    } else {
      onCloseRef.current?.()
    }
  }
  const requestCloseRef = useRef(requestClose)
  requestCloseRef.current = requestClose

  useEffect(() => {
    if (open) {
      setAdditionalOpen(false)
      setIsEditing(false)
      setIsDeleteOpen(false)
      setEditError('')
      setDeleteError('')
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
    return undefined
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape' && isAssigneeMenuOpen) {
        event.stopPropagation()
        setIsAssigneeMenuOpen(false)
        return
      }
      if (event.key === 'Escape' && !isEditing && !isDeleteOpen && !isDeleting) {
        requestCloseRef.current()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, isEditing, isDeleteOpen, isDeleting, isAssigneeMenuOpen])

  useEffect(() => {
    if (!isAssigneeMenuOpen) return undefined
    const handlePointerDown = (event) => {
      if (!assigneeMenuRef.current?.contains(event.target)) setIsAssigneeMenuOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isAssigneeMenuOpen])

  useEffect(() => {
    if (!open) return undefined
    const onPopState = () => {
      onCloseRef.current?.()
    }
    window.history.pushState({ overlay: true }, '', window.location.href)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [open])

  useEffect(() => {
    if (!open || !token || !pipeline?.id) {
      setAssignees([])
      setIsLoadingAssignees(false)
      setAssigneeLoadError('')
      return undefined
    }

    let cancelled = false
    setIsLoadingAssignees(true)
    setAssigneeLoadError('')
    fetchCrmAssignees(token, pipeline.id)
      .then((users) => {
        if (!cancelled) setAssignees(Array.isArray(users) ? users : [])
      })
      .catch((error) => {
        if (!cancelled) setAssigneeLoadError(error?.message || 'Unable to load eligible users.')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAssignees(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, token, pipeline?.id, assigneesReloadTick])

  const handleDelete = async () => {
    setIsDeleting(true)
    setDeleteError('')
    try {
      await deleteCrmDeal(token, deal.id)
      setIsDeleteOpen(false)
      onDeleted?.(deal.id)
      if (window.history.state?.overlay) {
        window.history.back()
      } else {
        onCloseRef.current?.()
      }
    } catch (error) {
      setDeleteError(error?.message || 'Unable to delete deal.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClientUpdated = (updatedClient) => {
    onDealUpdated?.({ ...deal, client: { ...deal.client, ...updatedClient } })
  }

  const handleAssigneeChange = async (assignedUserId) => {
    assignedUserId = assignedUserId || null
    if (assignedUserId === (deal.assignedUserId || null)) return

    setIsAssigning(true)
    setAssignmentError('')
    try {
      const updatedDeal = await assignCrmDeal(token, deal.id, assignedUserId)
      onDealUpdated?.(updatedDeal)
      setIsAssigneeMenuOpen(false)
      setAssignmentToast({
        message: updatedDeal.assignedUserId
          ? `Deal reassigned to ${updatedDeal.assignedUserUsername || 'user'}`
          : 'Deal unassigned',
        type: 'success',
      })
    } catch (error) {
      setAssignmentError(error?.message || 'Unable to assign deal.')
    } finally {
      setIsAssigning(false)
    }
  }

  const startEditing = () => {
    setEditForm({
      name: client.name || '',
      email: client.email || '',
      phoneNumber: client.phoneNumber || '',
    })
    setEditCustomFields(
      Object.entries(client.customFields || {}).map(([key, value]) => ({ key, value: String(value) })),
    )
    setEditError('')
    setIsEditing(true)
  }

  const cancelEditing = () => {
    if (isSaving) return
    setIsEditing(false)
    setEditError('')
  }

  const saveClientChanges = async (event) => {
    event.preventDefault()
    if (!editForm.name.trim()) {
      setEditError('Enter a client name.')
      return
    }
    const { payload, error } = buildClientPayload({ ...editForm, customFields: editCustomFields })
    if (error) {
      setEditError(error)
      return
    }

    setIsSaving(true)
    setEditError('')
    try {
      const updatedClient = await updateClient(token, client.id, payload)
      handleClientUpdated(updatedClient)
      setIsEditing(false)
    } catch (err) {
      setEditError(err?.message || 'Unable to update client.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!open || !deal) return null

  const client = deal.client || {}
  const stage = stages.find((item) => String(item.id) === String(deal.stageId))
  const customFields = client.customFields || {}
  const assignedUsername =
    assignees.find((user) => user.id === deal.assignedUserId)?.username ||
    deal.assignedUserUsername ||
    'Unassigned'
  const fieldClass =
    'h-9 w-full rounded-xs border px-2 text-sm text-[var(--ew-ink)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60'
  const fieldStyle = { borderColor: 'var(--ew-field-line)', background: 'var(--ew-surface)' }

  return createPortal(
    <>
      <DrawerBackdrop />
      <div
        className={`fixed bottom-0 right-0 top-16 z-50 w-full transition-transform duration-300 ease-[var(--md-ease,0.16,1,0.3,1)] sm:w-[26rem] ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ transitionTimingFunction: slideEase }}
      >
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="deal-details-title"
          className="flex h-full w-full flex-col border-l border-[var(--ew-line)] bg-[var(--ew-surface)] shadow-panel"
        >
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--ew-line)] px-5">
            <h2 id="deal-details-title" className="text-sm font-semibold text-[var(--ew-ink)]">
              Deal details
            </h2>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close deal details"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-[var(--ew-line)] text-[var(--ew-muted)] transition-colors hover:bg-[var(--ew-ground)] hover:text-[var(--ew-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ew-accent)]"
            >
              <LuX className="h-4 w-4" />
            </button>
          </header>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={saveClientChanges}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <section className="px-5 py-5">
              <div className="flex justify-end">
                <span className="inline-flex items-center rounded-none border border-[var(--ew-line)] bg-[var(--ew-ground)] px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--ew-muted)]">
                  Deal #{deal.id}
                </span>
              </div>
              <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ew-muted)]">
                Client
              </h3>
              <dl className="mt-3 space-y-3">
                <Field label="Name">
                  {isEditing ? (
                    <input
                      aria-label="Client name"
                      required
                      maxLength={200}
                      disabled={isSaving}
                      className={fieldClass}
                      style={fieldStyle}
                      value={editForm.name}
                      onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  ) : (
                    client.name || '—'
                  )}
                </Field>
                {(client.phoneNumber || isEditing) && (
                  <Field label="Phone" copyValue={client.phoneNumber}>
                    {isEditing ? (
                      <input
                        aria-label="Client phone"
                        type="tel"
                        maxLength={40}
                        disabled={isSaving}
                        className={fieldClass}
                        style={fieldStyle}
                        value={editForm.phoneNumber}
                        onChange={(event) =>
                          setEditForm((current) => ({ ...current, phoneNumber: event.target.value }))
                        }
                      />
                    ) : (
                      <a
                        href={`tel:${client.phoneNumber}`}
                        className="text-[var(--ew-accent-strong)] underline-offset-2 hover:underline"
                      >
                        {client.phoneNumber}
                      </a>
                    )}
                  </Field>
                )}
                {(client.email || isEditing) && (
                  <Field label="Email" copyValue={client.email}>
                    {isEditing ? (
                      <input
                        aria-label="Client email"
                        type="email"
                        maxLength={320}
                        disabled={isSaving}
                        className={fieldClass}
                        style={fieldStyle}
                        value={editForm.email}
                        onChange={(event) =>
                          setEditForm((current) => ({ ...current, email: event.target.value }))
                        }
                      />
                    ) : (
                      <a
                        href={`mailto:${client.email}`}
                        className="text-[var(--ew-accent-strong)] underline-offset-2 hover:underline"
                      >
                        {client.email}
                      </a>
                    )}
                  </Field>
                )}
                {(Object.keys(customFields).length > 0 || isEditing) && (
                  <div>
                    {isEditing ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              setEditCustomFields((current) => [...current, { key: '', value: '' }])
                            }
                            disabled={isSaving || editCustomFields.length >= MAX_CUSTOM_FIELDS}
                            className="inline-flex items-center gap-1.5 rounded-xs border px-3 py-2 text-xs font-medium text-[var(--ew-ink)] hover:bg-ground/70 disabled:opacity-50"
                            style={{ borderColor: 'var(--ew-line)' }}
                          >
                            <LuPlus className="h-3.5 w-3.5" />
                            Add field
                          </button>
                        </div>
                        {editCustomFields.map((field, index) => (
                          <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                            <input
                              aria-label={`Additional field ${index + 1} name`}
                              placeholder="Field name"
                              maxLength={100}
                              disabled={isSaving}
                              className={fieldClass}
                              style={fieldStyle}
                              value={field.key}
                              onChange={(event) =>
                                setEditCustomFields((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, key: event.target.value } : item,
                                  ),
                                )
                              }
                            />
                            <input
                              aria-label={`Additional field ${index + 1} value`}
                              placeholder="Value"
                              maxLength={1000}
                              disabled={isSaving}
                              className={fieldClass}
                              style={fieldStyle}
                              value={field.value}
                              onChange={(event) =>
                                setEditCustomFields((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, value: event.target.value } : item,
                                  ),
                                )
                              }
                            />
                            <button
                              type="button"
                              aria-label={`Remove additional field ${index + 1}`}
                              disabled={isSaving}
                              onClick={() =>
                                setEditCustomFields((current) => current.filter((_, itemIndex) => itemIndex !== index))
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-xs text-[var(--ew-muted)] hover:bg-ground hover:text-[var(--ew-accent-strong)] disabled:opacity-50"
                            >
                              <LuTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setAdditionalOpen((value) => !value)}
                          aria-expanded={additionalOpen}
                          className="mt-4 flex w-full items-center justify-between gap-3 rounded-[4px] border border-[var(--ew-line)] bg-[var(--ew-ground)] px-3 py-2 text-sm font-semibold text-[var(--ew-ink)] transition-colors hover:bg-[#f0e6df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ew-accent)]"
                        >
                          <span>Additional fields ({Object.keys(customFields).length})</span>
                          <LuChevronDown
                            className={`h-4 w-4 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                              additionalOpen ? 'rotate-180' : ''
                            }`}
                            aria-hidden="true"
                          />
                        </button>
                        <div
                          className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                            additionalOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                          }`}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <ul className="mt-2 divide-y divide-[var(--ew-line)] rounded-[6px] border border-[var(--ew-line)]">
                              {Object.entries(customFields).map(([key, value]) => (
                                <li key={key} className="flex items-start justify-between gap-3 px-3 py-2">
                                  <span className="shrink-0 text-xs text-[var(--ew-muted)]">{key}</span>
                                  <span className="min-w-0 truncate text-right text-sm text-[var(--ew-ink)]">{value}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {!isEditing && !client.phoneNumber && !client.email && Object.keys(customFields).length === 0 && (
                  <p className="text-sm text-[var(--ew-muted)]">No contact details yet.</p>
                )}
              </dl>
              {editError && (
                <p
                  role="alert"
                  className="mt-4 rounded-xs border px-3 py-2 text-sm text-[var(--ew-accent-strong)]"
                  style={{ borderColor: 'rgba(194,65,12,.28)', background: 'rgba(194,65,12,.06)' }}
                >
                  {editError}
                </p>
              )}
            </section>

            <hr className="mx-5 border-t border-[var(--ew-line)]" />

            <section className="px-5 py-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ew-muted)]">
                Deal
              </h3>
              <dl className="mt-3 divide-y divide-[var(--ew-line)] rounded-[6px] border border-[var(--ew-line)]">
                <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                  <dt className="flex items-center gap-2 text-xs text-[var(--ew-muted)]">
                    <MdKeyboardDoubleArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    Stage
                  </dt>
                  <dd className="truncate text-sm font-medium text-[var(--ew-ink)]">{stage?.name || '—'}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                  <dt className="flex items-center gap-2 text-xs text-[var(--ew-muted)]">
                    <LuLayers className="h-3.5 w-3.5" aria-hidden="true" />
                    Pipeline
                  </dt>
                  <dd className="truncate text-sm text-[var(--ew-ink)]">{pipeline?.name || '—'}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                  <dt className="flex items-center gap-2 text-xs text-[var(--ew-muted)]">
                    <LuUser className="h-3.5 w-3.5" aria-hidden="true" />
                    Assigned to
                  </dt>
                  <dd className="min-w-0 truncate text-right text-sm text-[var(--ew-ink)]">{assignedUsername}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                  <dt className="flex items-center gap-2 text-xs text-[var(--ew-muted)]">
                    <LuUser className="h-3.5 w-3.5" aria-hidden="true" />
                    Added by
                  </dt>
                  <dd className="truncate text-sm text-[var(--ew-ink)]">{deal.createdByUsername || '—'}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                  <dt className="flex items-center gap-2 text-xs text-[var(--ew-muted)]">
                    <LuCalendar className="h-3.5 w-3.5" aria-hidden="true" />
                    Added
                  </dt>
                  <dd className="text-sm tabular-nums text-[var(--ew-ink)]">{formatDateTime(deal.createdAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                  <dt className="flex items-center gap-2 text-xs text-[var(--ew-muted)]">
                    <LuCalendar className="h-3.5 w-3.5" aria-hidden="true" />
                    Updated
                  </dt>
                  <dd className="text-sm tabular-nums text-[var(--ew-ink)]">{formatDateTime(deal.updatedAt)}</dd>
                </div>
              </dl>
            </section>
          </div>

          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--ew-line)] px-5 py-3">
            {isEditing ? (
              <div className="ml-auto flex gap-2">
              <>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={isSaving}
                  className="rounded-xs border px-4 py-2 text-sm font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground/70 disabled:opacity-50"
                  style={{ borderColor: 'var(--ew-line)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xs bg-[#cc785c] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
              </>
              </div>
            ) : (
              <>
                <div className="flex min-w-0 items-center gap-2">
                  <div className="relative min-w-0" ref={assigneeMenuRef}>
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={isAssigneeMenuOpen}
                      disabled={isAssigning || isLoadingAssignees || isDeleting}
                      aria-busy={isAssigning || isLoadingAssignees}
                      onClick={() => {
                        setAssignmentError('')
                        setIsAssigneeMenuOpen((isOpen) => !isOpen)
                      }}
                      className={`relative inline-flex h-10 max-w-48 items-center gap-2 overflow-hidden rounded-xs bg-[#cc785c] px-3 text-xs font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60 ${
                        isAssigning || isLoadingAssignees
                          ? 'before:absolute before:inset-y-0 before:-left-1/2 before:w-1/2 before:animate-[assign-shimmer_1.2s_ease-in-out_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/35 before:to-transparent before:content-[""] before:pointer-events-none motion-reduce:before:animate-none'
                          : ''
                      }`}
                    >
                      <FaUserPen className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">Assign</span>
                      <LuChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    </button>
                    {isAssigneeMenuOpen ? (
                      <div
                        role="menu"
                        aria-label="Assign deal"
                        className="absolute bottom-full left-0 z-[60] mb-2 max-h-64 w-64 overflow-y-auto rounded-xs border bg-[var(--ew-surface)] p-1 shadow-panel"
                        style={{ borderColor: 'var(--ew-line)' }}
                      >
                        {assigneeLoadError ? (
                          <div className="px-3 py-2">
                            <p role="alert" className="text-xs text-danger">{assigneeLoadError}</p>
                            <button
                              type="button"
                              onClick={() => setAssigneesReloadTick((tick) => tick + 1)}
                              className="mt-1 text-xs font-medium text-[var(--ew-accent-strong)] underline"
                            >
                              Retry
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              role="menuitemradio"
                              aria-checked={!deal.assignedUserId}
                              disabled={isAssigning}
                              onClick={() => handleAssigneeChange(null)}
                              className="flex w-full items-center justify-between rounded-xs px-3 py-2 text-left text-sm text-[var(--ew-ink)] hover:bg-ground/70 disabled:opacity-60"
                            >
                              Unassigned
                              {!deal.assignedUserId ? <LuCheck className="h-4 w-4 text-[#cc785c]" /> : null}
                            </button>
                            {deal.assignedUserId &&
                              !assignees.some((user) => user.id === deal.assignedUserId) && (
                                <p className="px-3 py-2 text-xs text-[var(--ew-muted)]">
                                  Current owner “{deal.assignedUserUsername || 'Unknown'}” is no longer eligible.
                                </p>
                              )}
                            {assignees.map((user) => (
                              <button
                                key={user.id}
                                type="button"
                                role="menuitemradio"
                                aria-checked={user.id === deal.assignedUserId}
                                disabled={isAssigning}
                                onClick={() => handleAssigneeChange(user.id)}
                                className="flex w-full items-center justify-between gap-2 rounded-xs px-3 py-2 text-left text-sm text-[var(--ew-ink)] hover:bg-ground/70 disabled:opacity-60"
                              >
                                <span className="truncate">{user.username}</span>
                                {user.id === deal.assignedUserId ? (
                                  <LuCheck className="h-4 w-4 shrink-0 text-[#cc785c]" />
                                ) : null}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    ) : null}
                    {assignmentError ? (
                      <p role="alert" className="absolute bottom-full left-0 mb-1 w-64 text-xs text-danger">
                        {assignmentError}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={startEditing}
                    disabled={isDeleting}
                    aria-label={`Edit ${client.name || 'client'}`}
                    title="Edit client"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-50"
                  >
                    <LuPencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError('')
                      setIsDeleteOpen(true)
                    }}
                    disabled={isDeleting}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xs bg-danger px-4 text-sm font-medium text-white transition-colors hover:bg-danger-strong disabled:opacity-50"
                  >
                    <LuTrash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </footer>
          </form>
        </aside>
      </div>
      <Alert
        open={isDeleteOpen}
        title="Remove deal from pipeline?"
        description={`"${client.name || 'This client'}" will be removed from "${pipeline?.name || 'this pipeline'}". The client and any deals in other pipelines will remain.`}
        confirmLabel="Delete deal"
        isConfirming={isDeleting}
        feedback={deleteError}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!isDeleting) setIsDeleteOpen(false)
        }}
      />
      <Toast
        open={Boolean(assignmentToast)}
        message={assignmentToast?.message}
        type={assignmentToast?.type}
        onClose={() => setAssignmentToast(null)}
      />
    </>,
    document.body,
  )
}
