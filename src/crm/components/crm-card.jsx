import { useDraggable } from '@dnd-kit/core'
import { LuGripVertical, LuMail, LuPhone } from 'react-icons/lu'
import { MdKeyboardDoubleArrowRight } from 'react-icons/md'
import { dealDndId } from '../utils.js'

const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })
const datedFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

function formatAdded(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return `Added ${(sameYear ? dateFormat : datedFormat).format(date)}`
}

/** Visual body of a deal card, shared by the board card and the drag overlay. */
function DealCardBody({ deal, showGrip = true, onView }) {
  const { client } = deal
  return (
    <>
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold leading-5 text-[var(--ew-ink)]" title={client.name}>
          {client.name}
        </h3>
        {showGrip ? (
          <LuGripVertical
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ew-muted)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden="true"
          />
        ) : null}
      </div>

      {(client.email || client.phoneNumber) && (
        <dl className="mt-2 space-y-1">
          {client.phoneNumber && (
            <div className="flex min-w-0 items-center gap-2 text-xs leading-5 text-[var(--ew-muted)]">
              <dt className="shrink-0">
                <LuPhone className="h-3.5 w-3.5" aria-label="Phone" />
              </dt>
              <dd className="min-w-0 truncate tabular-nums">{client.phoneNumber}</dd>
            </div>
          )}
          {client.email && (
            <div className="flex min-w-0 items-center gap-2 text-xs leading-5 text-[var(--ew-muted)]">
              <dt className="shrink-0">
                <LuMail className="h-3.5 w-3.5" aria-label="Email" />
              </dt>
              <dd className="min-w-0 truncate" title={client.email}>
                {client.email}
              </dd>
            </div>
          )}
        </dl>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--ew-line)] pt-2">
        <p className="text-[11px] leading-4 tabular-nums text-[var(--ew-muted)]">{formatAdded(deal.createdAt)}</p>
        {onView ? (
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              onView(deal)
            }}
            className="inline-flex items-center gap-1 rounded-[2px] border border-[var(--ew-line)] px-2 py-0.5 text-[11px] font-medium text-[var(--ew-ink)] transition-colors hover:border-[var(--ew-accent)] hover:bg-[#cc785c] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ew-accent)]"
          >
            View
            <MdKeyboardDoubleArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </>
  )
}

const cardSurface =
  'relative rounded-[10px] border bg-[var(--ew-surface)] px-3 py-2.5'

/**
 * A deal on the board. While it is being dragged, the card stays in its column
 * as a dashed slot and the moving copy is rendered by <DealCardOverlay>.
 */
export default function CrmCard({ deal, draggable = false, onView }) {
  const client = deal?.client
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dealDndId(deal?.id),
    data: { deal },
    disabled: !client || !draggable,
  })

  if (!client) return null

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        aria-hidden="true"
        className={`${cardSurface} border-dashed border-[#d9bfb1] bg-[#fbf3ee]`}
      >
        <div className="invisible">
          <DealCardBody deal={deal} />
        </div>
      </div>
    )
  }

  return (
    <article
      ref={setNodeRef}
      aria-label={`Deal: ${client.name}`}
      {...attributes}
      {...listeners}
      className={`group ${cardSurface} border-[#d9d2c9] shadow-[0_1px_2px_rgba(27,26,24,0.08),0_4px_10px_-6px_rgba(27,26,24,0.2)] outline-none transition-[background-color,border-color,box-shadow] duration-150 ease-out focus-visible:border-[var(--ew-accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--ew-accent)]/45 ${
        draggable
          ? 'cursor-grab touch-none hover:border-[#dfae95] hover:bg-[#fff8f3] hover:shadow-[0_1px_2px_rgba(27,26,24,0.08),0_8px_18px_-8px_rgba(183,108,79,0.32)]'
          : ''
      }`}
    >
      <DealCardBody deal={deal} showGrip={draggable} onView={onView} />
    </article>
  )
}

/** The card as it follows the pointer: lifted, with a deeper shadow. */
export function DealCardOverlay({ deal }) {
  if (!deal?.client) return null
  return (
    <article
      aria-hidden="true"
      className={`crm-card-lift ${cardSurface} cursor-grabbing border-[var(--ew-accent)] shadow-[0_2px_4px_rgba(27,26,24,0.08),0_18px_36px_-12px_rgba(27,26,24,0.32)]`}
    >
      <DealCardBody deal={deal} showGrip={false} />
    </article>
  )
}
