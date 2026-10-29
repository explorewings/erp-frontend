import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuCheck, LuCircleAlert, LuX } from 'react-icons/lu'

export default function Toast({ open, message, type = 'success', onClose, duration = 3000 }) {
  const [visible, setVisible] = useState(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open || !message) {
      setVisible(false)
      return undefined
    }

    const enterFrame = requestAnimationFrame(() => setVisible(true))
    const timer = window.setTimeout(() => {
      setVisible(false)
      const unmount = window.setTimeout(() => onCloseRef.current?.(), 300)
      return () => window.clearTimeout(unmount)
    }, duration)

    return () => {
      window.cancelAnimationFrame(enterFrame)
      window.clearTimeout(timer)
    }
  }, [open, message, duration])

  if (!message) return null

  const isSuccess = type === 'success'

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={`fixed z-[70] flex max-w-sm items-start gap-3 rounded-control border px-4 py-3 shadow-panel transition-all duration-300 ease-out ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        left: '50%',
        bottom: '1.5rem',
        transform: visible ? 'translateX(-50%)' : 'translate(-50%, 1rem)',
        borderColor: 'var(--ew-line)',
        background: 'var(--ew-surface)',
      }}
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill"
        style={{
          background: isSuccess
            ? 'rgba(21, 128, 61, 0.12)'
            : 'rgba(185, 28, 28, 0.12)',
          color: isSuccess ? '#15803d' : '#b91c1c',
        }}
      >
        {isSuccess ? <LuCheck className="h-4 w-4" /> : <LuCircleAlert className="h-4 w-4" />}
      </span>
      <p className="flex-1 text-body-sm text-[var(--ew-ink)]">{message}</p>
      <button
        type="button"
        onClick={() => {
          setVisible(false)
          window.setTimeout(() => onClose?.(), 300)
        }}
        aria-label="Dismiss"
        className="flex h-6 w-6 items-center justify-center rounded-control text-muted transition-colors hover:text-ink"
      >
        <LuX className="h-3.5 w-3.5" />
      </button>
    </div>,
    document.body,
  )
}
