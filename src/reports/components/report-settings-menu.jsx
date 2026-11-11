import { useEffect, useRef, useState } from 'react'
import { LuSave, LuSettings2 } from 'react-icons/lu'
import { BUTTON } from '../../calendar/components/drawer-shell.jsx'
import { fetchReportSettings, updateReportSettings } from '../api.js'

// Shown Monday first; values use the server's 0 = Sunday … 6 = Saturday.
const DAYS = [
  { value: 1, short: 'Mon', long: 'Monday' },
  { value: 2, short: 'Tue', long: 'Tuesday' },
  { value: 3, short: 'Wed', long: 'Wednesday' },
  { value: 4, short: 'Thu', long: 'Thursday' },
  { value: 5, short: 'Fri', long: 'Friday' },
  { value: 6, short: 'Sat', long: 'Saturday' },
  { value: 0, short: 'Sun', long: 'Sunday' },
]

function sameDays(a, b) {
  return a.length === b.length && [...a].sort().every((value, index) => value === [...b].sort()[index])
}

/**
 * Settings icon + dropdown (superadmin/superuser only): the daily due time for
 * reports and the off days. Off days do both jobs: no report can be dated on
 * them, and no "report not submitted" reminder is sent on them.
 */
export default function ReportSettingsMenu({ token, disabled = false, onSaved }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saved, setSaved] = useState(null)
  const [dueTime, setDueTime] = useState('')
  const [skipDays, setSkipDays] = useState([])
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open || !token) return undefined
    let cancelled = false
    setLoading(true)
    setError('')
    setNotice('')
    fetchReportSettings(token)
      .then((result) => {
        if (cancelled) return
        setSaved(result)
        setDueTime(result?.dueTime ?? '')
        setSkipDays(Array.isArray(result?.skipDays) ? result.skipDays : [])
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError?.message || 'Unable to load report settings.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, token])

  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape' && !saving) setOpen(false)
    }
    const handlePointer = (event) => {
      if (!saving && !containerRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('touchstart', handlePointer)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('touchstart', handlePointer)
    }
  }, [open, saving])

  const toggleDay = (value) => {
    setNotice('')
    setSkipDays((current) => current.includes(value) ? current.filter((day) => day !== value) : [...current, value])
  }

  const dirty = saved !== null && ((saved.dueTime ?? '') !== dueTime || !sameDays(saved.skipDays ?? [], skipDays))

  const save = async () => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await updateReportSettings(token, { dueTime: dueTime || null, skipDays })
      setSaved(result)
      setDueTime(result?.dueTime ?? '')
      setSkipDays(Array.isArray(result?.skipDays) ? result.skipDays : [])
      onSaved?.(result)
      setNotice(result?.dueTime ? 'Settings saved.' : 'Saved. Reminders are off.')
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save report settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Report settings"
        title="Report settings"
        className={`inline-flex h-8 w-8 items-center justify-center rounded-xs border transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 disabled:opacity-60 sm:h-10 sm:w-10 ${
          open ? 'border-accent bg-accent/5 text-ink' : 'border-field bg-surface text-muted hover:bg-ground'
        }`}
      >
        <LuSettings2 className="h-4 w-4" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Report settings"
          className="absolute right-0 top-full z-[70] mt-2 w-72 max-w-[calc(100vw-32px)] rounded-tile border border-line bg-surface p-4 shadow-panel"
        >
          <p className="text-body-sm font-semibold text-ink">Report settings</p>
          <p className="mt-0.5 text-meta text-muted">
            Times are in {saved?.timezone === 'Asia/Kolkata' || !saved?.timezone ? 'IST (Asia/Kolkata)' : saved.timezone}.
          </p>

          {loading ? (
            <p className="py-6 text-center text-meta text-muted" role="status">Loading…</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="report-due-time" className="block text-meta font-medium text-ink">
                  Submission due time
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    id="report-due-time"
                    type="time"
                    value={dueTime}
                    onChange={(event) => {
                      setNotice('')
                      setDueTime(event.target.value)
                    }}
                    disabled={saving || saved === null}
                    className="h-9 min-w-0 flex-1 rounded-xs border border-field bg-surface px-3 text-body-sm text-ink outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
                  />
                  {dueTime ? (
                    <button
                      type="button"
                      onClick={() => {
                        setNotice('')
                        setDueTime('')
                      }}
                      disabled={saving}
                      className="h-9 shrink-0 rounded-xs border border-field px-3 text-meta font-medium text-muted hover:bg-ground disabled:opacity-60"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                <p className="mt-1.5 text-label text-muted">
                  {dueTime
                    ? 'People who haven’t submitted that day’s report get a reminder after this time.'
                    : 'No due time set, so no reminders are sent.'}
                </p>
              </div>

              <fieldset disabled={saving || saved === null}>
                <legend className="text-meta font-medium text-ink">Off days</legend>
                <div className="mt-1.5 grid grid-cols-7 gap-1">
                  {DAYS.map((day) => {
                    const skipped = skipDays.includes(day.value)
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        aria-pressed={skipped}
                        aria-label={`${day.long}: ${skipped ? 'off day' : 'working day'}`}
                        title={day.long}
                        className={`h-8 rounded-xs border text-label font-medium transition-colors disabled:opacity-60 ${
                          skipped
                            ? 'border-accent bg-accent text-white'
                            : 'border-field bg-surface text-ink hover:bg-ground'
                        }`}
                      >
                        {day.short}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-1.5 text-label text-muted">
                  No reports can be dated on off days, and no reminders are sent on them.
                </p>
              </fieldset>

              {error ? <p role="alert" className="text-meta text-danger-strong">{error}</p> : null}
              {notice ? <p role="status" className="text-meta text-muted">{notice}</p> : null}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || !dirty}
                  className={BUTTON.primary}
                >
                  <LuSave className="h-4 w-4" aria-hidden="true" />
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
