import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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
      style={{
        borderColor: 'var(--ew-line)',
        background: 'var(--ew-surface)',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : undefined,
      }}
      {...attributes}
      {...listeners}
      className={`${draggable ? 'touch-none cursor-grab active:cursor-grabbing' : ''} rounded-control border p-3.5 shadow-sm`}
    >
      <h3 className="truncate text-sm font-semibold text-[var(--ew-ink)]">{client.name}</h3>
      <div className="mt-1 space-y-1">
        {client.email && <p className="truncate text-xs text-[var(--ew-muted)]">{client.email}</p>}
        {client.phoneNumber && <p className="truncate text-xs text-[var(--ew-muted)]">{client.phoneNumber}</p>}
      </div>
    </article>
  )
}
