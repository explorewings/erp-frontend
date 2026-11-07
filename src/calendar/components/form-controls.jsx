import { useId, useMemo, useState } from 'react'
import { LuSearch } from 'react-icons/lu'

/*
 * Form controls shared by every calendar form (task, announcement, meeting).
 * Matches the Clients/CRM form vocabulary: 44px fields, Field Line border,
 * accent focus ring, small uppercase labels.
 */

export const fieldClass =
  'mt-1.5 h-11 w-full rounded-xs border bg-surface px-3.5 text-body-sm normal-case tracking-normal text-ink outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60'
export const fieldStyle = { borderColor: 'var(--ew-field-line)' }
const inlineFieldClass =
  'h-11 rounded-xs border bg-surface px-3.5 text-body-sm text-ink outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60'
const labelClass = 'block text-label font-medium uppercase tracking-[0.08em] text-muted'

export function Field({ label, required, hint, error, children, htmlFor }) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
        {required ? <span className="text-accent-strong"> *</span> : null}
        {!required && hint === undefined ? (
          <span className="font-normal normal-case tracking-normal"> (optional)</span>
        ) : null}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-meta text-muted">{hint}</p> : null}
      {error ? (
        <p className="mt-1.5 text-meta text-danger-strong" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function TextInput({ id, value, onChange, ...rest }) {
  return (
    <input
      id={id}
      className={fieldClass}
      style={fieldStyle}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      {...rest}
    />
  )
}

export function TextArea({ id, value, onChange, rows = 3, ...rest }) {
  return (
    <textarea
      id={id}
      rows={rows}
      className={`${fieldClass} h-auto resize-y py-2.5 leading-relaxed`}
      style={fieldStyle}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      {...rest}
    />
  )
}

export function DateTimeInput({ id, value, onChange, ...rest }) {
  return (
    <input
      id={id}
      type="datetime-local"
      className={`${fieldClass} tabular-nums`}
      style={fieldStyle}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      {...rest}
    />
  )
}

const DURATION_UNITS = [
  { id: 'minutes', label: 'Minutes', factor: 1 },
  { id: 'hours', label: 'Hours', factor: 60 },
  { id: 'days', label: 'Days', factor: 1440 },
]

export function pickDurationUnit(minutes) {
  if (minutes >= 1440 && minutes % 1440 === 0) return 'days'
  if (minutes >= 60 && minutes % 60 === 0) return 'hours'
  return 'minutes'
}

/** Amount + unit; reports total minutes. The server only stores ends_at. */
export function DurationInput({ id, minutes, onChange, disabled }) {
  const [unit, setUnit] = useState(() => pickDurationUnit(minutes))
  const factor = DURATION_UNITS.find((item) => item.id === unit).factor
  const amount = minutes ? Math.round((minutes / factor) * 100) / 100 : ''

  return (
    <div className="mt-1.5 flex gap-2">
      <input
        id={id}
        type="number"
        min="1"
        step="any"
        inputMode="decimal"
        className={`${inlineFieldClass} w-0 min-w-0 flex-1 tabular-nums`}
        style={fieldStyle}
        value={amount}
        disabled={disabled}
        onChange={(event) => {
          const next = Number(event.target.value)
          onChange(Number.isFinite(next) && next > 0 ? Math.round(next * factor) : 0)
        }}
      />
      <select
        aria-label="Duration unit"
        className={`${inlineFieldClass} w-28 shrink-0 px-2.5`}
        style={fieldStyle}
        value={unit}
        disabled={disabled}
        onChange={(event) => setUnit(event.target.value)}
      >
        {DURATION_UNITS.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  )
}

const roleLabel = (role) =>
  role === 'superadmin' || role === 'superuser' ? 'Superadmin' : role === 'admin' ? 'Admin' : 'Staff'

export function personName(person, viewerId) {
  if (!person) return 'Unassigned'
  const name = person.username || person.email || 'Unknown user'
  return person.id === viewerId ? `${name} (you)` : name
}

export function AssigneeSelect({ id, value, onChange, options, viewerId, disabled }) {
  return (
    <select
      id={id}
      className={fieldClass}
      style={fieldStyle}
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      required
    >
      <option value="" disabled>
        Choose a person
      </option>
      {options.map((person) => (
        <option key={person.id} value={person.id}>
          {personName(person, viewerId)} · {roleLabel(person.role)}
        </option>
      ))}
    </select>
  )
}

/** Searchable checkbox list for meeting members (any role). */
export function MemberPicker({ users, value, onChange, viewerId, disabled }) {
  const [query, setQuery] = useState('')
  const searchId = useId()
  const selected = useMemo(() => new Set(value), [value])
  const candidates = users.filter((user) => user.id !== viewerId)
  const term = query.trim().toLowerCase()
  const visible = term
    ? candidates.filter((user) => `${user.username} ${user.email}`.toLowerCase().includes(term))
    : candidates

  const toggle = (id) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange([...next])
  }

  return (
    <div className="mt-1.5 overflow-hidden rounded-xs border" style={fieldStyle}>
      <div className="flex items-center gap-2 border-b border-line px-3">
        <LuSearch className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        <input
          id={searchId}
          type="search"
          placeholder="Search people"
          aria-label="Search people to invite"
          className="h-10 min-w-0 flex-1 bg-transparent text-body-sm text-ink outline-none placeholder:text-muted"
          value={query}
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
        />
        <span className="shrink-0 text-meta tabular-nums text-muted">{selected.size} invited</span>
      </div>
      <ul className="max-h-48 overflow-y-auto py-1">
        {visible.length === 0 ? (
          <li className="px-3 py-3 text-body-sm text-muted">
            {candidates.length === 0 ? 'No other active people to invite.' : 'No one matches that search.'}
          </li>
        ) : (
          visible.map((user) => (
            <li key={user.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-body-sm text-ink hover:bg-ground">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#cc785c]"
                  checked={selected.has(user.id)}
                  disabled={disabled}
                  onChange={() => toggle(user.id)}
                />
                <span className="min-w-0 flex-1 truncate">{user.username || user.email}</span>
                <span className="shrink-0 text-meta text-muted">{roleLabel(user.role)}</span>
              </label>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
