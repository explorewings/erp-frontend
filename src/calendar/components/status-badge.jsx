import { EVENT_TYPES, statusMeta } from '../lib/event-meta.js'

/** `count` is the task's reject count: a resent task reads "Assigned (2)". */
export function StatusBadge({ status, count = 0, className = '' }) {
  const meta = statusMeta(status)
  const { colors } = meta
  const label = status === 'assigned' && count > 0 ? `${meta.label} (${count + 1})` : meta.label
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-[3px] border px-1.5 py-px text-meta font-medium leading-5 ${className}`}
      style={{ color: colors.text, background: colors.bg, borderColor: colors.border }}
    >
      {status === 'live' ? <span className="h-1.5 w-1.5 animate-pulse rounded-[1px] bg-white motion-reduce:animate-none" aria-hidden="true" /> : null}
      {label}
    </span>
  )
}

export function TypeDot({ type, className = '' }) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-pill ${className}`}
      style={{ background: EVENT_TYPES[type]?.color ?? '#9d978e' }}
      aria-hidden="true"
    />
  )
}

export function TypeLabel({ type }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-meta font-medium text-muted">
      <TypeDot type={type} />
      {EVENT_TYPES[type]?.label ?? type}
    </span>
  )
}
