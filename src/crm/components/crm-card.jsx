import { memo, useEffect, useRef, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { LuMail, LuPhone } from 'react-icons/lu'
import { MdKeyboardDoubleArrowRight } from 'react-icons/md'
import { VscSettings } from 'react-icons/vsc'
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
const DealCardBody = memo(function DealCardBody({
  deal,
  showSettings = false,
  onView,
  onRequestDelete,
}) {
  const { client } = deal
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    if (!menuOpen) return undefined
    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const menuItemClass =
    'flex w-full items-center px-3 py-1.5 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:bg-[var(--ew-line)]/40'

  return (
    <>
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold leading-5 text-[var(--ew-ink)]" title={client.name}>
          {client.name}
        </h3>
        {showSettings ? (
          <div
            ref={menuRef}
            className="relative shrink-0"
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Deal actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={(event) => {
                event.stopPropagation()
                setMenuOpen((open) => !open)
              }}
              className="grid h-6 w-6 place-items-center rounded-[4px] border border-[var(--ew-line)] bg-[linear-gradient(145deg,#ffffff,#f4eee9)] text-[var(--ew-muted)] shadow-[1.5px_1.5px_3px_rgba(27,26,24,0.14),-1.5px_-1.5px_3px_rgba(255,255,255,0.95),inset_1px_1px_1px_rgba(255,255,255,0.9)] transition-[color,border-color,box-shadow] duration-150 hover:border-[var(--ew-accent)] hover:text-[var(--ew-ink)] hover:shadow-[2px_2px_5px_rgba(27,26,24,0.16),-2px_-2px_5px_rgba(255,255,255,0.98),inset_1px_1px_1px_rgba(255,255,255,0.95)] active:shadow-[inset_2px_2px_4px_rgba(27,26,24,0.15),inset_-2px_-2px_4px_rgba(255,255,255,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ew-accent)]"
            >
              <VscSettings className="h-3.5 w-3.5 drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]" aria-hidden="true" />
            </button>
            {menuOpen ? (
              <div
                role="menu"
                aria-label="Deal actions"
                className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-[6px] border border-[var(--ew-line)] bg-[var(--ew-surface)] py-1 text-[var(--ew-ink)] shadow-[0_8px_24px_-8px_rgba(27,26,24,0.35)]"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeMenu()
                    onRequestDelete?.(deal)
                  }}
                  className={`${menuItemClass} text-danger hover:bg-danger/10`}
                >
                  Delete
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled
                  title="Not available yet"
                  className={`${menuItemClass} cursor-not-allowed text-[var(--ew-muted)] opacity-50`}
                >
                  Move to pipeline
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled
                  title="Not available yet"
                  className={`${menuItemClass} cursor-not-allowed text-[var(--ew-muted)] opacity-50`}
                >
                  Copy to pipeline
                </button>
              </div>
            ) : null}
          </div>
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
})

const cardSurface =
  'relative rounded-[10px] border bg-[var(--ew-surface)] px-3 py-2.5'

/**
 * A deal on the board. While it is being dragged, the card stays in its column
 * as a dashed slot and the moving copy is rendered by <DealCardOverlay>.
 */
function CrmCard({ deal, draggable = false, onView, onRequestDeleteDeal }) {
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
      <DealCardBody
        deal={deal}
        showSettings={Boolean(onRequestDeleteDeal)}
        onView={onView}
        onRequestDelete={onRequestDeleteDeal}
      />
    </article>
  )
}

export default memo(CrmCard)

/** The card as it follows the pointer: lifted, with a deeper shadow. */
export function DealCardOverlay({ deal }) {
  if (!deal?.client) return null
  return (
    <article
      aria-hidden="true"
      className={`${cardSurface} cursor-grabbing border-[var(--ew-accent)] shadow-[0_2px_6px_rgba(27,26,24,0.16),0_8px_18px_-8px_rgba(27,26,24,0.2)]`}
    >
      <DealCardBody deal={deal} showSettings={false} />
    </article>
  )
}
