import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LuFileText, LuLink2, LuPlus } from 'react-icons/lu'
import { useAuth } from '../../authetication/auth-context.js'
import Loader from '../../appcomponents/loader.jsx'
import Toast from '../../appcomponents/toast.jsx'
import { createReport, deleteReport, fetchReport, fetchReports, updateReport } from '../api.js'
import ReportDateFilter from '../components/report-date-filter.jsx'
import ReportDrawer from '../components/report-drawer.jsx'
import ReportSettingsMenu from '../components/report-settings-menu.jsx'
import ReportUserFilter from '../components/report-user-filter.jsx'
import ReportViewDrawer from '../components/report-view-drawer.jsx'
import { formatDateShort, todayIso } from '../lib/dates.js'
import { isWithinEditWindow } from '../lib/report-rules.js'

function canEditReport(report, user) {
  const elevated = user?.role === 'superadmin' || user?.role === 'superuser'
  return elevated || (report.createdBy === user?.id && isWithinEditWindow(report.submittedAt))
}

function ReportCard({ report, onView }) {
  const attachment = report.attachment
  return (
    <button
      type="button"
      onClick={() => onView(report)}
      aria-label={`View report for ${formatDateShort(report.reportDate)}`}
      className="min-w-0 w-full rounded-control border p-4 text-left transition-colors hover:bg-ground/50 sm:p-5"
      style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-ink">{formatDateShort(report.reportDate)}</h2>
          <p className="mt-1 text-xs text-muted">Created by {report.createdByUsername || 'Unknown user'}</p>
        </div>
        <span className="shrink-0 rounded-none bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-strong">
          {report.reports.length} {report.reports.length === 1 ? 'point' : 'points'}
        </span>
      </div>
      <div className="mt-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">Submitted</p>
          <time className="mt-1 block text-xs text-muted" dateTime={report.submittedAt}>
            {new Date(report.submittedAt).toLocaleString()}
          </time>
          {report.editedAt ? (
            <span
              className="ml-1.5 text-xs italic text-muted"
              title={`Edited ${new Date(report.editedAt).toLocaleString()}`}
            >
              Edited
            </span>
          ) : null}
          <p className="mt-1 truncate text-xs text-muted">
            {report.reports[0]}
          </p>
          {attachment ? (
            <p className="mt-1 truncate text-xs text-muted">
              {attachment.type === 'file' ? <LuFileText className="mr-1 inline h-3.5 w-3.5" /> : <LuLink2 className="mr-1 inline h-3.5 w-3.5" />}
              {attachment.name || attachment.url}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  )
}

export default function Reports() {
  const { token, user } = useAuth()
  const [reports, setReports] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalReports, setTotalReports] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [reloadTick, setReloadTick] = useState(0)
  const [formReport, setFormReport] = useState(undefined)
  const [viewReport, setViewReport] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [toast, setToast] = useState(null)
  const [submittedToday, setSubmittedToday] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [todayChecked, setTodayChecked] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const linkedReportId = Number(searchParams.get('report')) || null
  const linkedNew = searchParams.get('new') === '1'
  const isElevated = user?.role === 'superadmin' || user?.role === 'superuser'
  const canSubmit = useMemo(
    () => ['staff', 'admin', 'superadmin', 'superuser'].includes(user?.role ?? ''),
    [user?.role],
  )

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError('')
    fetchReports(token, page, selectedDate, selectedUser)
      .then((result) => {
        if (cancelled) return
        setReports(Array.isArray(result?.items) ? result.items : [])
        setTotalPages(Number(result?.totalPages) || 0)
        setTotalReports(Number(result?.total) || 0)
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError?.message || 'Unable to load reports.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, page, selectedDate, selectedUser, reloadTick])

  const saveReport = async (id, formData) => {
    const saved = id ? await updateReport(token, id, formData) : await createReport(token, formData)
    if (id) {
      setReports((current) => current.map((item) => item.id === id ? saved : item))
    } else {
      setPage(1)
      setSelectedDate(null)
      setSelectedUser(null)
    }
    setFormReport(undefined)
    setError('')
    setWarning(saved.cleanupWarning || '')
    setReloadTick((tick) => tick + 1)
  }

  const openNewReport = () => {
    if (submittedToday) {
      setToast({
        type: 'error',
        message: 'You already submitted a report for today.',
      })
      return
    }
    setFormReport(null)
  }

  useEffect(() => {
    let cancelled = false
    if (!token) return undefined
    // Check today's report independently of the active date filter/pagination,
    // so the New report button is gated reliably.
    fetchReports(token, 1, todayIso())
      .then((result) => {
        if (cancelled) return
        const items = Array.isArray(result?.items) ? result.items : []
        setSubmittedToday(items.some((item) => item.createdBy === user?.id))
      })
      .catch(() => {
        if (!cancelled) setSubmittedToday(false)
      })
      .finally(() => {
        if (!cancelled) setTodayChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [token, user?.id, reloadTick])

  // Notification links: ?report=<id> opens that report, ?new=1 opens the new-report form.
  // The parameter is removed once handled so closing the drawer doesn't reopen it.
  const clearLinkParam = (name) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete(name)
      return next
    }, { replace: true })
  }

  useEffect(() => {
    if (!linkedReportId || !token) return undefined
    let cancelled = false
    fetchReport(token, linkedReportId)
      .then((report) => {
        if (!cancelled) setViewReport(report)
      })
      .catch((loadError) => {
        if (!cancelled) setToast({ type: 'error', message: loadError?.message || 'Unable to open that report.' })
      })
      .finally(() => {
        if (!cancelled) clearLinkParam('report')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedReportId, token])

  useEffect(() => {
    if (!linkedNew || !todayChecked || !canSubmit) return
    clearLinkParam('new')
    openNewReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedNew, todayChecked, canSubmit])

  const saveRemarks = (updated) => {
    setReports((current) => current.map((item) => item.id === updated.id ? updated : item))
    setViewReport(updated)
  }

  const removeReport = async (id) => {
    await deleteReport(token, id)
    setViewReport(null)
    setWarning('')
    setReloadTick((tick) => tick + 1)
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      {formReport === undefined && canSubmit ? (
        <div className="flex items-center justify-end gap-2">
          {isElevated ? (
            <ReportUserFilter
              value={selectedUser}
              token={token}
              disabled={isLoading}
              onChange={(next) => {
                setSelectedUser(next)
                setPage(1)
              }}
            />
          ) : null}
          <ReportDateFilter
            value={selectedDate}
            disabled={isLoading}
            onChange={(next) => {
              setSelectedDate(next)
              setPage(1)
            }}
          />
          <button
            type="button"
            onClick={openNewReport}
            aria-label="New report"
            title="New report"
            className="inline-flex h-8 w-8 items-center justify-center rounded-xs bg-accent text-sm font-medium text-white hover:bg-accent-strong sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2.5"
          >
            <LuPlus className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">New report</span>
          </button>
          {isElevated ? <ReportSettingsMenu token={token} /> : null}
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xs border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger-strong">
          <span>{error}</span>
          <button type="button" onClick={() => setReloadTick((tick) => tick + 1)} className="rounded-xs border border-danger/30 px-3 py-1.5 font-medium hover:bg-danger/10">Retry</button>
        </div>
      ) : null}
      {warning ? <p role="status" className="rounded-xs border border-amber-500/30 bg-amber-50 px-4 py-3 text-sm text-amber-900">{warning}</p> : null}

      <ReportDrawer
        open={formReport !== undefined}
        report={formReport ?? null}
        onClose={() => setFormReport(undefined)}
        onSaved={saveReport}
      />
      <ReportViewDrawer
        open={viewReport !== null}
        report={viewReport}
        token={token}
        canEdit={viewReport ? canEditReport(viewReport, user) : false}
        canReview={isElevated}
        onClose={() => setViewReport(null)}
        onEdit={(report) => {
          setViewReport(null)
          setFormReport(report)
        }}
        onRemarksSaved={saveRemarks}
        onDelete={removeReport}
      />

      {isLoading ? (
        <div className="flex min-h-[70vh] items-center justify-center rounded-lg border border-line bg-surface"><Loader /></div>
      ) : reports.length ? (
        <div className="flex min-h-[70vh] flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onView={setViewReport}
              />
            ))}
          </div>
          {totalPages > 1 ? (
            <nav aria-label="Reports pagination" className="mt-auto flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
              <p className="text-sm text-muted">
                Showing {(page - 1) * 100 + 1}–{Math.min(page * 100, totalReports)} of {totalReports} reports
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="rounded-xs border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-ground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="min-w-20 text-center text-sm text-muted">Page {page} of {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages}
                  className="rounded-xs border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-ground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </nav>
          ) : null}
        </div>
      ) : error ? null : (
        <div className="flex min-h-[70vh] flex-col items-center justify-center rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
          <LuFileText className="mx-auto h-8 w-8 text-muted" />
          <h2 className="mt-3 text-title font-semibold text-ink">
            {selectedDate || selectedUser ? 'No matching reports' : 'No reports yet'}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {selectedDate
              ? `${isElevated ? 'No one submitted' : 'You have not submitted'} a report on ${formatDateShort(selectedDate)}.`
              : selectedUser
                ? 'This person has not submitted any reports yet.'
                : 'Submitted reports will appear here.'}
          </p>
          {selectedDate || selectedUser ? (
            <button
              type="button"
              onClick={() => { setSelectedDate(null); setSelectedUser(null); setPage(1) }}
              className="mt-4 rounded-xs border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-ground"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      )}

      <Toast
        open={Boolean(toast)}
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
        centerWithinMain
      />

    </section>
  )
}
