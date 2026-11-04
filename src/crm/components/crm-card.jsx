import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LuGripVertical, LuMail, LuPhone } from 'react-icons/lu'

const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?'

export default function CrmCard({ deal, draggable = false }) {
  const client = deal?.client
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `deal-${deal?.id}`, disabled: !client || !draggable })

  if (!client) return null

  return (
    <article
      ref={setNodeRef}
      aria-label={`Deal for ${client.name}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        opacity: isDragging ? 0.97 : 1,
        background: isDragging ? '#ffffff' : 'rgba(255,255,255,0.96)',
        border: isDragging ? '1px solid #cc785c' : '1px solid rgba(255,255,255,0.95)',
        borderRadius: '18px',
        boxShadow: isDragging
          ? '12px 16px 32px rgba(204,120,92,0.24), -8px -8px 20px rgba(255,255,255,0.95), inset 2px 2px 4px rgba(255,255,255,0.95)'
          : '8px 10px 22px rgba(221,194,178,0.48), -6px -6px 16px rgba(255,255,255,0.95), inset 2px 2px 4px rgba(255,255,255,0.95), inset -2px -2px 4px rgba(247,232,224,0.85)',
      }}
      {...attributes}
      {...listeners}
      className={`${draggable ? 'touch-none cursor-grab active:cursor-grabbing' : ''} group relative overflow-hidden p-3.5 focus-within:ring-4 focus-within:ring-[#d69375]/30 focus:outline-none`}
    >
      <div className="absolute inset-x-0 top-0 h-1.5 bg-[#e8a88b]" aria-hidden="true" />

      <div className="flex items-start gap-3 pt-1.5">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center text-sm font-bold tracking-wide text-[#b76c4f]"
          style={{
            borderRadius: '14px',
            background: '#f7e8e0',
            border: '1px solid rgba(255,255,255,0.95)',
            boxShadow: '4px 4px 10px rgba(221,194,178,0.5), -3px -3px 8px rgba(255,255,255,0.95), inset 2px 2px 4px rgba(255,255,255,0.95), inset -2px -2px 4px rgba(221,194,178,0.45)',
          }}
          aria-hidden="true"
        >
          {getInitials(client.name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-bold leading-5 tracking-[-0.01em] text-[var(--ew-ink)]">{client.name}</h3>
            <LuGripVertical className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ew-muted)] opacity-60 transition group-hover:opacity-100" aria-hidden="true" />
          </div>

          {deal?.id != null && (
            <p className="mt-0.5 text-[11px] font-semibold tracking-[0.08em] text-[var(--ew-muted)] uppercase tabular-nums">
              Client deal #{deal.id}
            </p>
          )}
        </div>
      </div>

      <div
        className="mt-3 space-y-1.5 pt-3"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.95)',
          boxShadow: 'inset 0 1px 0 rgba(221,194,178,0.45)',
        }}
      >
        {client.email && (
          <p className="flex min-w-0 items-center gap-2 text-xs leading-5 text-[var(--ew-muted)]">
            <LuMail className="h-3.5 w-3.5 shrink-0 text-[#b76c4f]" aria-hidden="true" />
            <span className="truncate">{client.email}</span>
          </p>
        )}
        {client.phoneNumber && (
          <p className="flex min-w-0 items-center gap-2 text-xs leading-5 text-[var(--ew-muted)]">
            <LuPhone className="h-3.5 w-3.5 shrink-0 text-[#b76c4f]" aria-hidden="true" />
            <span className="truncate">{client.phoneNumber}</span>
          </p>
        )}
      </div>
    </article>
  )
}
