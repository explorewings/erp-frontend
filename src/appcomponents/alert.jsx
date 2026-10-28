import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { LuCircleAlert, LuX } from 'react-icons/lu'

export default function Alert({
  open,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  isConfirming = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') onCancel?.()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  const confirmBg =
    variant === 'destructive' ? 'bg-danger' : 'bg-[#cc785c]'
  const confirmHover =
    variant === 'destructive' ? 'hover:bg-danger-strong' : 'hover:bg-[#b36a4e]'

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/30"
        aria-hidden="true"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-title"
        className="relative w-full max-w-md rounded-control border bg-surface p-6 shadow-2xl"
        style={{ borderColor: 'var(--ew-line)' }}
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control"
            style={{ background: 'var(--ew-danger-soft, #fef2f1)', color: 'var(--ew-danger, #dc2626)' }}
          >
            <LuCircleAlert className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id="alert-title" className="text-title text-[var(--ew-ink)]">
              {title}
            </h2>
            {description && (
              <p className="mt-1.5 text-body-sm text-[var(--ew-muted)]">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="rounded-xs border px-4 py-2 text-body-sm font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground/70 disabled:opacity-60"
            style={{ borderColor: 'var(--ew-line)' }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`rounded-xs px-4 py-2 text-body-sm font-medium text-white transition-colors disabled:opacity-60 ${confirmBg} ${confirmHover}`}
          >
            {isConfirming ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
