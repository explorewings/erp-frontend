import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function Tooltip({ children, content, cursor = true, className = 'relative inline-flex' }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!open || !cursor) return undefined

    const update = (event) => {
      setPosition({ x: event.clientX, y: event.clientY })
    }
    window.addEventListener('mousemove', update)
    return () => window.removeEventListener('mousemove', update)
  }, [open, cursor])

  if (!content) return children

  return (
    <span
      ref={triggerRef}
      className={className}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[60] rounded-xs border border-[var(--ew-line)] bg-[#cc785c] px-2 py-1 text-xs font-medium text-white shadow-panel whitespace-nowrap"
            style={{ left: position.x - 8, top: position.y + 14, transform: 'translate(-100%, 0)' }}
          >
            {content}
          </span>,
          document.body,
        )
      )}
    </span>
  )
}
