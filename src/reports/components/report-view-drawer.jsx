import { useEffect, useState } from 'react'
import { LuCalendarDays, LuFileText, LuLink2, LuPencil, LuSave, LuTrash2, LuUserRound } from 'react-icons/lu'
import DrawerShell, { BUTTON, ErrorLine, FieldTile, Panel } from '../../calendar/components/drawer-shell.jsx'
import { updateReportRemarks } from '../api.js'
import { formatDateLong } from '../lib/dates.js'

function formatTimestamp(value) {
  return new Date(value).toLocaleString()
}

export default function ReportViewDrawer({
  open,
  report,
  token,
  canEdit,
  canReview,
  onClose,
  onEdit,
  onRemarksSaved,
  onDelete,
}) {
  const [remarks, setRemarks] = useState(report?.remarks ?? '')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!open) return
    setRemarks(report?.remarks ?? '')
    setError('')
    setNotice('')
    setConfirmDelete(false)
  }, [open, report?.id])

  if (!open || !report) return null

  const saveRemarks = async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const updated = await updateReportRemarks(token, report.id, remarks.trim() || null)
      onRemarksSaved?.(updated)
      setNotice('Remarks saved.')
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save remarks.')
    } finally {
      setBusy(false)
    }
  }

  const attachment = report.attachment

  const confirmRemove = async () => {
    setDeleting(true)
    setError('')
    try {
      await onDelete?.(report.id)
    } catch (deleteError) {
      setError(deleteError?.message || 'Unable to delete report.')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <DrawerShell
      labelledBy="report-view-title"
      closeLabel="Close report details"
      busy={busy}
      closeOnBack
      onClose={onClose}
      header={
        <div>
          <p className="text-meta text-muted">Work report</p>
          <h2 id="report-view-title" className="truncate text-body-sm font-semibold text-ink">
            {formatDateLong(report.reportDate)}
          </h2>
        </div>
      }
      actions={
        canEdit ? (
          <button
            type="button"
            onClick={() => onEdit?.(report)}
            disabled={busy}
            aria-label="Edit report"
            title="Edit report"
            className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 disabled:opacity-50"
          >
            <LuPencil className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null
      }
    >
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5" aria-busy={busy}>
        <Panel>
          <dl className="grid grid-cols-2 gap-3">
            <FieldTile label="Report date" icon={LuCalendarDays}>
              {formatDateLong(report.reportDate)}
            </FieldTile>
            <FieldTile label="Created by" icon={LuUserRound}>
              {report.createdByUsername || 'Unknown user'}
            </FieldTile>
            <FieldTile label="Submitted" wide>
              {formatTimestamp(report.submittedAt)}
            </FieldTile>
          </dl>
        </Panel>

        <Panel title={`Report points (${report.reports.length})`} icon={LuFileText}>
          <ol className="space-y-3">
            {report.reports.map((point, index) => (
              <li key={`${report.id}-${index}`} className="flex gap-3 text-body-sm leading-relaxed text-ink">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xs bg-ground text-meta font-medium text-muted">
                  {index + 1}
                </span>
                <span className="whitespace-pre-wrap break-words pt-0.5">{point}</span>
              </li>
            ))}
          </ol>
        </Panel>

        {attachment ? (
          <Panel title="Attachment" icon={attachment.type === 'file' ? LuFileText : LuLink2}>
            <a
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="break-all text-body-sm font-medium text-accent-strong underline underline-offset-2"
            >
              {attachment.name || attachment.url}
            </a>
          </Panel>
        ) : null}

        {canReview ? (
          <Panel title="Reviewer remarks">
            <div className="space-y-3">
              <textarea
                id={`remarks-${report.id}`}
                rows={4}
                maxLength={4000}
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder="Add remarks for this report..."
                disabled={busy}
                className="w-full resize-y rounded-xs border border-field bg-surface px-3 py-2 text-body-sm text-ink outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
              />
              {notice ? <p role="status" className="text-meta text-muted">{notice}</p> : null}
            </div>
          </Panel>
        ) : report.remarks ? (
          <Panel title="Remarks">
            <p className="whitespace-pre-wrap break-words text-body-sm leading-relaxed text-ink">{report.remarks}</p>
          </Panel>
        ) : null}

        {error ? <ErrorLine message={error} /> : null}
      </div>

      {canEdit || canReview ? (
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-surface px-5 py-4">
          {canEdit ? (
            confirmDelete ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-meta text-ink">Delete this report?</span>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className={BUTTON.neutral}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmRemove()}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-xs bg-danger px-3 py-2 text-meta font-medium text-white transition-colors hover:bg-danger-strong disabled:opacity-60"
                >
                  <LuTrash2 className="h-4 w-4" aria-hidden="true" />
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={busy || deleting}
                className="inline-flex items-center gap-2 rounded-xs border border-danger/30 px-3 py-2 text-meta font-medium text-danger-strong transition-colors hover:bg-danger/10 disabled:opacity-50"
              >
                <LuTrash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </button>
            )
          ) : (
            <span />
          )}

          {canReview ? (
            <div className="flex shrink-0 items-center gap-3">
              {error ? <p role="alert" className="min-w-0 text-meta text-danger-strong">{error}</p> : null}
              <button
                type="button"
                onClick={() => void saveRemarks()}
                disabled={busy || remarks === (report.remarks ?? '')}
                className={BUTTON.primary}
              >
                <LuSave className="h-4 w-4" aria-hidden="true" />
                {busy ? 'Saving…' : 'Save remarks'}
              </button>
            </div>
          ) : null}
        </footer>
      ) : null}
    </DrawerShell>
  )
}
