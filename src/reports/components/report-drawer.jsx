import { useState } from 'react'
import { LuCalendarDays, LuFileText, LuLink2, LuPlus, LuTrash2, LuUpload } from 'react-icons/lu'
import DrawerShell, { BUTTON, ErrorLine, Panel } from '../../calendar/components/drawer-shell.jsx'
import { todayIso } from '../lib/dates.js'

const FILE_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp'

function makeFormData(form, attachmentMode, file) {
  const data = new FormData()
  data.append('reportDate', form.reportDate)
  data.append('reports', JSON.stringify(form.points))
  data.append('attachmentMode', attachmentMode)
  if (attachmentMode === 'url') data.append('attachmentUrl', form.attachmentUrl.trim())
  if (attachmentMode === 'file' && file) data.append('file', file)
  return data
}

function ReportForm({ report, onClose, onSaved }) {
  const [reportDate, setReportDate] = useState(report?.reportDate ?? todayIso())
  const [points, setPoints] = useState(report?.reports?.length ? report.reports : [''])
  const [attachmentMode, setAttachmentMode] = useState(
    report?.attachment?.type === 'file' ? 'keep' : report?.attachment?.type === 'url' ? 'url' : 'none',
  )
  const [attachmentUrl, setAttachmentUrl] = useState(
    report?.attachment?.type === 'url' ? report.attachment.url : '',
  )
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const setPoint = (index, value) =>
    setPoints((current) => current.map((point, pointIndex) => pointIndex === index ? value : point))

  const handleSubmit = async (event) => {
    event.preventDefault()
    const cleanPoints = points.map((point) => point.trim())
    if (!reportDate) {
      setError('Choose the date this report covers.')
      return
    }
    if (!cleanPoints.length || cleanPoints.some((point) => !point)) {
      setError('Complete each report point or remove empty points.')
      return
    }
    if (attachmentMode === 'url' && !attachmentUrl.trim()) {
      setError('Enter the attachment URL.')
      return
    }
    if (attachmentMode === 'file' && !file) {
      setError('Choose a file to upload.')
      return
    }

    setBusy(true)
    setError('')
    try {
      await onSaved(report?.id, makeFormData({ reportDate, points: cleanPoints, attachmentUrl }, attachmentMode, file))
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save report.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex min-h-0 flex-1 flex-col" aria-busy={busy}>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
        <Panel title="Report date" icon={LuCalendarDays}>
          <label className="block max-w-xs text-meta font-medium text-muted" htmlFor="report-date">
            Date this report covers
            <input
              id="report-date"
              required
              type="date"
              value={reportDate}
              onChange={(event) => setReportDate(event.target.value)}
              disabled={busy}
              className="mt-1.5 h-10 w-full rounded-xs border border-field bg-surface px-3 text-body-sm text-ink outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
            />
          </label>
          <p className="mt-2 text-meta text-muted">Submission time is recorded automatically.</p>
          {report ? (
            <p className="mt-2 text-meta text-muted">Reports can be edited or deleted for 15 minutes after submission.</p>
          ) : null}
        </Panel>

        <Panel title={`Report points (${points.length})`} icon={LuFileText}>
          <div className="space-y-3">
            <p className="text-meta text-muted">Add each item separately. Use the orange plus to add another point.</p>
            <fieldset className="space-y-2">
              <legend className="sr-only">Report points</legend>
              {points.map((point, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border border-line bg-ground text-meta font-medium text-muted">
                    {index + 1}
                  </span>
                  <textarea
                    required
                    rows={1}
                    maxLength={5000}
                    value={point}
                    onChange={(event) => setPoint(index, event.target.value)}
                    aria-label={`Report point ${index + 1}`}
                    disabled={busy}
                    className="h-10 min-h-10 min-w-0 flex-1 resize-y rounded-xs border border-field bg-surface px-3 py-2 text-body-sm text-ink outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
                  />
                  {index < points.length - 1 ? (
                    <button
                      type="button"
                      aria-label={`Remove report point ${index + 1}`}
                      disabled={busy}
                      onClick={() => setPoints((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs text-muted transition-colors hover:bg-ground hover:text-accent-strong focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 disabled:opacity-50"
                    >
                      <LuTrash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPoints((current) => [...current, ''])}
                      disabled={points.length >= 100 || busy}
                      aria-label="Add report point"
                      title="Add report point"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 disabled:opacity-50"
                    >
                      <LuPlus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </fieldset>
          </div>
        </Panel>

        <Panel title="Supporting attachment" icon={LuUpload}>
          <fieldset className="space-y-3">
            <legend className="sr-only">Optional attachment</legend>
            <p className="text-meta text-muted">Optionally attach a file or link related to this report.</p>
            <div className="flex flex-wrap gap-2">
              {[
                ['none', 'None', null],
                ['url', 'Link', LuLink2],
                ['file', 'File', LuUpload],
                ...(report?.attachment ? [['keep', 'Keep current', LuFileText]] : []),
              ].map(([mode, label, Icon]) => (
                <label
                  key={mode}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-xs border px-3 py-2 text-meta font-medium transition-colors ${
                    attachmentMode === mode
                      ? 'border-accent bg-accent/5 text-ink'
                      : 'border-line bg-surface text-muted hover:bg-ground'
                  }`}
                >
                  <input
                    type="radio"
                    name="report-attachment-mode"
                    value={mode}
                    checked={attachmentMode === mode}
                    onChange={() => setAttachmentMode(mode)}
                    disabled={busy}
                    className="accent-[#cc785c]"
                  />
                  {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
                  {label}
                </label>
              ))}
            </div>
            {attachmentMode === 'url' ? (
              <label className="block text-meta font-medium text-muted" htmlFor="report-attachment-url">
                Attachment link
                <input
                  id="report-attachment-url"
                  type="url"
                  value={attachmentUrl}
                  onChange={(event) => setAttachmentUrl(event.target.value)}
                  placeholder="https://..."
                  disabled={busy}
                  className="mt-1.5 h-10 w-full rounded-xs border border-field bg-surface px-3 text-body-sm text-ink outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
                />
              </label>
            ) : null}
            {attachmentMode === 'file' ? (
              <label
                htmlFor="report-attachment-file"
                className={`group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xs border-2 border-dashed px-4 py-8 text-center transition-colors ${busy ? 'pointer-events-none opacity-60' : ''} ${
                  file
                    ? 'border-accent/60 bg-accent/5'
                    : 'border-field bg-surface hover:border-accent/50 hover:bg-accent/5'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                    file ? 'bg-accent/15 text-accent-strong' : 'bg-ground text-muted group-hover:text-accent-strong'
                  }`}
                >
                  {file ? <LuFileText className="h-6 w-6" /> : <LuUpload className="h-6 w-6" />}
                </span>
                <span className="block min-w-0 max-w-full break-all text-body-sm font-medium text-ink">
                  {file ? file.name : 'Click to upload a file'}
                </span>
                <span className="block text-meta text-muted">
                  {file ? 'Click to choose a different file' : 'PDF, Word, Excel, CSV, TXT or image'}
                </span>
                <input
                  id="report-attachment-file"
                  aria-label="Report attachment file"
                  type="file"
                  accept={FILE_ACCEPT}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  disabled={busy}
                  className="sr-only"
                />
              </label>
            ) : null}
            {attachmentMode === 'keep' && report?.attachment ? (
              <p className="break-all rounded-xs border border-line bg-ground px-3 py-2 text-meta text-muted">
                Keeping {report.attachment.name || report.attachment.url}
              </p>
            ) : null}
          </fieldset>
        </Panel>

        {error ? <ErrorLine message={error} /> : null}
      </div>

      <footer className="flex shrink-0 justify-end gap-2 border-t border-line bg-surface px-4 py-3 sm:px-5">
        <button type="button" onClick={onClose} disabled={busy} className={BUTTON.neutral}>Cancel</button>
        <button type="submit" disabled={busy} className={BUTTON.primary}>
          {busy ? 'Saving…' : report ? 'Save changes' : 'Submit report'}
        </button>
      </footer>
    </form>
  )
}

export default function ReportDrawer({ open, report, onClose, onSaved }) {
  if (!open) return null

  return (
    <DrawerShell
      labelledBy="report-drawer-title"
      closeLabel="Close report form"
      closeOnBack
      onClose={onClose}
      header={
        <div>
          <p className="text-meta text-muted">Work report</p>
          <h2 id="report-drawer-title" className="truncate text-body-sm font-semibold text-ink">
            {report ? 'Edit report' : 'New report'}
          </h2>
        </div>
      }
    >
      <ReportForm key={report?.id ?? 'new'} report={report} onClose={onClose} onSaved={onSaved} />
    </DrawerShell>
  )
}
