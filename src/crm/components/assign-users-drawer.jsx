import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuPencil, LuRotateCcw, LuUsers, LuX } from 'react-icons/lu'
import Alert from '../../appcomponents/alert.jsx'
import Toast from '../../appcomponents/toast.jsx'
import DrawerBackdrop from '../../appcomponents/drawer-backdrop.jsx'
import Tooltip from '../../appcomponents/tooltip.jsx'
import {
  fetchCrmPipelineUsers,
  previewCrmPipelineUsers,
  saveCrmPipelineUsers,
} from '../api.js'
import DealAssignPanel from './deal-assign-panel.jsx'
import InlineError from './inline-error.jsx'
import PipelineTag from './pipeline-tag.jsx'
import SlidingTabs from './sliding-tabs.jsx'
import UserSelect from './user-select.jsx'
import { isSuperRole } from '../utils.js'

const TABS = [
  { id: 'pipeline-access', label: 'Pipeline access' },
  { id: 'deal-assign', label: 'Deal assign' },
]

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

export default function AssignUsersDrawer({
  open,
  token,
  pipeline,
  user,
  onClose,
  onAccessChange,
  onRuleChange,
  onDealsChange,
}) {
  if (!open || !pipeline) return null
  return (
    <AssignUsersDrawerContent
      token={token}
      pipeline={pipeline}
      currentUser={user}
      onClose={onClose}
      onAccessChange={onAccessChange}
      onRuleChange={onRuleChange}
      onDealsChange={onDealsChange}
    />
  )
}

function AssignUsersDrawerContent({
  token,
  pipeline,
  currentUser,
  onClose,
  onAccessChange,
  onRuleChange,
  onDealsChange,
}) {
  const [visible, setVisible] = useState(false)
  const [activeTab, setActiveTab] = useState(TABS[0].id)
  const [members, setMembers] = useState([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)
  const [membersError, setMembersError] = useState('')
  const [membersReloadTick, setMembersReloadTick] = useState(0)
  const [isEditingAccess, setIsEditingAccess] = useState(false)
  // Staged edits: nothing reaches the server until Save.
  const [addedUsers, setAddedUsers] = useState([])
  const [removedIds, setRemovedIds] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [pendingSave, setPendingSave] = useState(null)
  const [accessError, setAccessError] = useState('')
  const [accessNotice, setAccessNotice] = useState('')
  // True while the Deal assign tab is saving, assigning or unassigning.
  const [isPanelBusy, setIsPanelBusy] = useState(false)
  const [busyToast, setBusyToast] = useState('')

  const onCloseRef = useRef(onClose)
  const ignorePopRef = useRef(false)
  const onAccessChangeRef = useRef(onAccessChange)

  const canEditAccess = isSuperRole(currentUser?.role)
  const memberIds = members.map((member) => member.id)
  const hasChanges = addedUsers.length > 0 || removedIds.length > 0
  const desiredIds = [
    ...memberIds.filter((id) => !removedIds.includes(id)),
    ...addedUsers.map((added) => added.id),
  ]
  const listedUsers = isEditingAccess
    ? [...members, ...addedUsers.map((added) => ({ ...added, isNew: true }))]
    : members

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    onAccessChangeRef.current = onAccessChange
  }, [onAccessChange])

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    let cancelled = false
    setIsLoadingMembers(true)
    setMembersError('')
    fetchCrmPipelineUsers(token, pipeline.id)
      .then((list) => {
        if (!cancelled) setMembers(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        if (!cancelled) setMembersError(err?.message || 'Unable to load pipeline users.')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMembers(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, pipeline.id, membersReloadTick])

  // Closing mid-action would leave deals half assigned or unassigned.
  const isBusy = isSaving || isPanelBusy
  const isBusyRef = useRef(isBusy)
  useEffect(() => {
    isBusyRef.current = isBusy
  }, [isBusy])
  const warnBusy = () => setBusyToast('Please wait until the action completes.')

  const closeDrawer = () => {
    if (isBusyRef.current) {
      warnBusy()
      return
    }
    ignorePopRef.current = true
    onCloseRef.current?.()
    if (window.history.state?.overlay) {
      window.history.back()
    } else {
      ignorePopRef.current = false
    }
  }

  const closeDrawerRef = useRef(closeDrawer)
  closeDrawerRef.current = closeDrawer

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape' && !event.defaultPrevented) closeDrawerRef.current()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    const onPopState = () => {
      if (ignorePopRef.current) {
        ignorePopRef.current = false
        return
      }
      if (isBusyRef.current) {
        // Browser back while busy: stay open (restore the overlay entry) and warn.
        window.history.pushState({ overlay: true }, '', window.location.href)
        setBusyToast('Please wait until the action completes.')
        return
      }
      onCloseRef.current?.()
    }
    window.history.pushState({ overlay: true }, '', window.location.href)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const resetDraft = () => {
    setAddedUsers([])
    setRemovedIds([])
    setPendingSave(null)
  }

  const startEditingAccess = () => {
    resetDraft()
    setIsEditingAccess(true)
    setAccessError('')
    setAccessNotice('')
  }

  const cancelEditingAccess = () => {
    resetDraft()
    setIsEditingAccess(false)
    setAccessError('')
  }

  const handleAddUser = (userId, picked) => {
    if (!userId) return
    if (removedIds.includes(userId)) {
      // Picking a user who is staged for removal just keeps them.
      setRemovedIds((ids) => ids.filter((id) => id !== userId))
      return
    }
    if (memberIds.includes(userId) || addedUsers.some((added) => added.id === userId)) return
    setAddedUsers((list) => [
      ...list,
      { id: userId, username: picked?.username, role: picked?.role, status: picked?.status },
    ])
    setAccessError('')
  }

  const toggleRemove = (member) => {
    if (member.isNew) {
      setAddedUsers((list) => list.filter((added) => added.id !== member.id))
      return
    }
    setRemovedIds((ids) =>
      ids.includes(member.id) ? ids.filter((id) => id !== member.id) : [...ids, member.id],
    )
    setAccessError('')
  }

  const commitSave = async (confirmUnassign) => {
    setIsSaving(true)
    setAccessError('')
    try {
      const result = await saveCrmPipelineUsers(token, pipeline.id, desiredIds, confirmUnassign)
      const next = Array.isArray(result.members) ? result.members : []
      setMembers(next)
      resetDraft()
      setIsEditingAccess(false)

      const parts = []
      if (result.addedCount) parts.push(`${plural(result.addedCount, 'user')} added`)
      if (result.removedCount) parts.push(`${plural(result.removedCount, 'user')} removed`)
      if (result.unassignedCount) parts.push(`${plural(result.unassignedCount, 'deal')} unassigned`)
      if (result.ruleChangedTo) parts.push('deal assignment rule switched to Manual')
      setAccessNotice(parts.length ? `Saved: ${parts.join(', ')}.` : 'Saved.')

      onAccessChangeRef.current?.(pipeline.id, next.map((member) => member.id))
      if (result.ruleChangedTo) onRuleChange?.(pipeline.id, result.ruleChangedTo)
      if (result.unassignedCount) onDealsChange?.()
    } catch (err) {
      if (err?.status === 409 && !confirmUnassign) {
        try {
          const preview = await previewCrmPipelineUsers(token, pipeline.id, desiredIds)
          setPendingSave(preview)
          return
        } catch {
          // fall through to the error below
        }
      }
      setAccessError(err?.message || 'Unable to save pipeline access.')
      setPendingSave(null)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = async () => {
    if (isSaving || !hasChanges) return
    if (removedIds.length === 0) {
      await commitSave(false)
      return
    }
    // Before saving removals, check whether they would leave deals without an owner.
    setIsSaving(true)
    setAccessError('')
    let preview
    try {
      preview = await previewCrmPipelineUsers(token, pipeline.id, desiredIds)
    } catch (err) {
      setAccessError(err?.message || 'Unable to check the changes.')
      setIsSaving(false)
      return
    }
    setIsSaving(false)
    if (preview.dealsToUnassign > 0 || preview.singleUserRemoved) {
      setPendingSave(preview)
    } else {
      await commitSave(false)
    }
  }

  const ownersLosingDeals = pendingSave?.removed?.filter((row) => row.dealCount > 0) ?? []

  return createPortal(
    <>
      <DrawerBackdrop />
      <div
        className={`fixed bottom-0 right-0 top-16 z-50 w-full transition-transform duration-300 ease-out sm:w-[32rem] ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-users-title"
          className="flex h-full w-full flex-col border-l border-[var(--ew-line)] bg-[var(--ew-surface)] shadow-panel"
        >
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--ew-line)] px-5">
            <div className="flex min-w-0 items-center gap-2">
              <LuUsers className="h-4 w-4 shrink-0 text-[var(--ew-ink)]" aria-hidden="true" />
              <div className="min-w-0">
                <h2 id="assign-users-title" className="inline text-sm font-semibold text-[var(--ew-ink)]">
                  Assign users
                </h2>
              </div>
              <PipelineTag name={pipeline.name} />
            </div>
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Close assign users"
              aria-disabled={isBusy}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border border-[var(--ew-line)] text-muted transition-colors hover:text-ink"
            >
              <LuX className="h-4 w-4" />
            </button>
          </header>

          <div className="border-b border-[var(--ew-line)] px-5 py-3">
            <SlidingTabs
              tabs={TABS}
              activeTab={activeTab}
              onChange={setActiveTab}
              ariaLabel="User assignment settings"
              idPrefix="assign-users"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <section
              id="assign-users-panel-pipeline-access"
              role="tabpanel"
              aria-labelledby="assign-users-tab-pipeline-access"
              hidden={activeTab !== 'pipeline-access'}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--ew-ink)]">Users with pipeline access</h3>
                  <p className="mt-1 text-xs text-[var(--ew-muted)]">
                    These users can access this pipeline and its deals.
                  </p>
                </div>
                {canEditAccess && !isEditingAccess ? (
                  <button
                    type="button"
                    onClick={startEditingAccess}
                    disabled={isLoadingMembers || Boolean(membersError)}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xs border border-[var(--ew-line)] bg-ground px-3 text-xs font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground/70 disabled:opacity-60"
                  >
                    <LuPencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit
                  </button>
                ) : null}
              </div>

              {isEditingAccess ? (
                <div className="mb-3 rounded-xs border p-3" style={{ borderColor: 'var(--ew-line)' }}>
                  <p className="text-xs font-medium text-[var(--ew-ink)]">Add user</p>
                  <p className="mt-1 text-xs text-[var(--ew-muted)]">
                    Pick users to add and mark the ones who should lose access. Nothing changes until you save.
                  </p>
                  <div className="mt-2">
                    <UserSelect
                      token={token}
                      value=""
                      onChange={handleAddUser}
                      excludedIds={desiredIds.map(String)}
                      disabled={isSaving}
                      placeholder="Select a user"
                    />
                  </div>
                </div>
              ) : null}

              {membersError ? (
                <InlineError>
                  {membersError}
                  <button
                    type="button"
                    onClick={() => setMembersReloadTick((tick) => tick + 1)}
                    className="ml-2 font-medium underline"
                  >
                    Retry
                  </button>
                </InlineError>
              ) : null}
              {accessError ? <InlineError className="mt-3">{accessError}</InlineError> : null}
              {accessNotice && !accessError ? (
                <p role="status" className="mb-3 mt-3 text-xs text-[var(--ew-muted)]">
                  {accessNotice}
                </p>
              ) : null}

              {membersError ? null : isLoadingMembers ? (
                <p role="status" className="py-6 text-center text-sm text-[var(--ew-muted)]">
                  Loading users...
                </p>
              ) : listedUsers.length === 0 ? (
                <p className="rounded-xs border border-dashed p-4 text-sm text-[var(--ew-muted)]">
                  No users are assigned to this pipeline.
                </p>
              ) : (
                <ul className="space-y-2">
                  {listedUsers.map((member) => {
                    const isCreator = member.id === pipeline.createdBy
                    const isSuper = isSuperRole(member.role)
                    const removable = isEditingAccess && !isCreator && (!isSuper || member.isNew)
                    const isRemoved = removedIds.includes(member.id)
                    const name = member.username || 'user'
                    return (
                      <li key={member.id}>
                        <Tooltip
                          content={isSuper && !member.isNew ? 'Superadmin has full access' : null}
                          className="block w-full"
                        >
                          <div
                            className={`flex items-center justify-between gap-3 rounded-xs border px-3 py-2 ${
                              isRemoved ? 'bg-danger-soft/40' : ''
                            }`}
                            style={{ borderColor: member.isNew ? '#cc785c' : 'var(--ew-line)' }}
                          >
                            <span className="min-w-0 truncate text-sm">
                              <span
                                className={
                                  isRemoved ? 'text-[var(--ew-muted)] line-through' : 'text-[var(--ew-ink)]'
                                }
                              >
                                {member.username || 'User unavailable'}
                              </span>
                              {isCreator ? (
                                <span className="ml-2 text-xs text-[var(--ew-muted)]">Pipeline creator</span>
                              ) : null}
                              {member.isNew ? (
                                <span className="ml-2 text-xs font-medium text-[#b76c4f]">New</span>
                              ) : null}
                              {isRemoved ? (
                                <span className="ml-2 text-xs text-danger">Will be removed</span>
                              ) : null}
                            </span>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="text-xs capitalize text-[var(--ew-muted)]">
                                {member.role || 'Unavailable'}
                                {member.status === 'inactive' ? ' · Inactive' : ''}
                              </span>
                              {removable ? (
                                <button
                                  type="button"
                                  onClick={() => toggleRemove(member)}
                                  disabled={isSaving}
                                  aria-label={
                                    isRemoved ? `Keep ${name} in this pipeline` : `Remove ${name} from this pipeline`
                                  }
                                  className="flex h-6 w-6 items-center justify-center rounded-xs border border-[var(--ew-line)] text-muted transition-colors hover:border-danger hover:text-danger disabled:opacity-60"
                                >
                                  {isRemoved ? (
                                    <LuRotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                                  ) : (
                                    <LuX className="h-3.5 w-3.5" aria-hidden="true" />
                                  )}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </Tooltip>
                      </li>
                    )
                  })}
                </ul>
              )}

            </section>

            <section
              id="assign-users-panel-deal-assign"
              role="tabpanel"
              aria-labelledby="assign-users-tab-deal-assign"
              hidden={activeTab !== 'deal-assign'}
            >
              <DealAssignPanel
                refreshKey={memberIds.join(',')}
                token={token}
                pipelineId={pipeline.id}
                canEdit={canEditAccess}
                isActive={activeTab === 'deal-assign'}
                onRuleChange={(method) => onRuleChange?.(pipeline.id, method)}
                onDealsChange={onDealsChange}
                onBusyChange={setIsPanelBusy}
              />
            </section>
          </div>

          {isEditingAccess && activeTab === 'pipeline-access' ? (
            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--ew-line)] bg-[var(--ew-surface)] px-5 py-3">
              <p className="min-w-0 text-xs text-[var(--ew-muted)]">
                {hasChanges
                  ? [
                      addedUsers.length ? `${addedUsers.length} to add` : null,
                      removedIds.length ? `${removedIds.length} to remove` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : 'No changes yet'}
              </p>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={cancelEditingAccess}
                  disabled={isSaving}
                  className="h-9 rounded-xs border border-[var(--ew-line)] bg-ground px-4 text-sm font-medium text-[var(--ew-muted)] transition-colors hover:bg-ground/70 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  className="h-9 rounded-xs bg-[#cc785c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#b76c4f] disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </footer>
          ) : null}
        </aside>
      </div>

      <Alert
        open={Boolean(pendingSave)}
        title={pendingSave?.dealsToUnassign > 0 ? 'Deals will be unassigned' : 'Assignment rule will change'}
        description={
          pendingSave?.dealsToUnassign > 0
            ? `The users you are removing own ${plural(pendingSave.dealsToUnassign, 'deal')} in this pipeline. Saving will unassign them; you can reassign them from Deal assign or the deal drawer.`
            : 'Saving changes how new deals in this pipeline are assigned.'
        }
        confirmLabel={pendingSave?.dealsToUnassign > 0 ? 'Unassign and save' : 'Save'}
        confirmingLabel="Saving..."
        isConfirming={isSaving}
        onConfirm={() => commitSave(true)}
        onCancel={() => setPendingSave(null)}
      >
        {ownersLosingDeals.length > 0 ? (
          <ul
            className="max-h-48 space-y-1 overflow-y-auto rounded-xs border p-2"
            style={{ borderColor: 'var(--ew-line)' }}
          >
            {ownersLosingDeals.map((row) => (
              <li key={row.userId} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-[var(--ew-ink)]">{row.username || 'User unavailable'}</span>
                <span className="shrink-0 text-xs text-[var(--ew-muted)]">{plural(row.dealCount, 'deal')}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {pendingSave?.singleUserRemoved ? (
          <p className="mt-3 text-xs text-[var(--ew-muted)]">
            {pendingSave.singleUserRemoved.username || 'This user'} receives every new deal (Single user rule). The
            rule will switch to <span className="font-medium text-[var(--ew-ink)]">Manual</span>, so new deals stay
            unassigned until you choose another rule.
          </p>
        ) : null}
      </Alert>
      <Toast open={Boolean(busyToast)} message={busyToast} type="error" onClose={() => setBusyToast('')} />
    </>,
    document.body,
  )
}
