import { useEffect, useState } from 'react'
import { createUser } from '../api.js'
import Loader from '../../appcomponents/loader.jsx'
import { EyeIcon, EyeOffIcon } from '../../components/icons.jsx'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'staff', label: 'Staff' },
]

export default function CreateUserModal({ open, token, onClose, onCreated }) {
  const [form, setForm] = useState({
    username: '',
    email: '',
    role: 'staff',
    password: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({ username: '', email: '', role: 'staff', password: '' })
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const created = await createUser(token, {
        username: form.username.trim(),
        email: form.email.trim(),
        role: form.role,
        password: form.password,
      })
      onCreated(created)
      onClose()
    } catch (err) {
      setError(err?.message || 'Unable to create user.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const roleTabs = (
    <div className="inline-flex rounded-lg border p-1"
         style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}>
      {ROLE_OPTIONS.map((option) => {
        const isActive = form.role === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, role: option.value }))}
            className={`${isActive ? 'rounded-xs' : 'rounded-lg'} px-4 py-1.5 text-sm font-medium transition-all duration-300 ease-out`}
            style={
              isActive
                ? { background: '#cc785c', color: '#fff' }
                : { color: 'var(--ew-muted)' }
            }
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )

  const fieldClass =
    'w-full rounded-xs border px-3.5 py-2.5 text-body-sm text-[var(--ew-ink)] outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15'
  const fieldStyle = { borderColor: 'var(--ew-field-line)', background: 'var(--ew-surface)' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-user-title"
    >
      <div
        className="relative w-full max-w-md rounded-control border p-6 shadow-2xl ring-1 ring-[var(--ew-line)]"
        style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="create-user-title" className="text-title text-[var(--ew-ink)]">
            Create user
          </h2>
          <div className="flex justify-end">{roleTabs}</div>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="cu-username">
              Username
            </label>
            <input
              id="cu-username"
              required
              className={fieldClass}
              style={fieldStyle}
              value={form.username}
              onChange={handleChange('username')}
            />
          </div>

          <div>
            <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="cu-email">
              Email
            </label>
            <input
              id="cu-email"
              type="email"
              required
              className={fieldClass}
              style={fieldStyle}
              value={form.email}
              onChange={handleChange('email')}
            />
          </div>

          <div>
            <label className="block text-label font-medium text-[var(--ew-muted)]" htmlFor="cu-password">
              Password
            </label>
            <div className="relative">
              <input
                id="cu-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                className={`${fieldClass} pr-11`}
                style={fieldStyle}
                value={form.password}
                onChange={handleChange('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xs text-muted outline-none transition-colors hover:text-ink focus-visible:ring-4 focus-visible:ring-accent/15"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="rounded-xs border px-3 py-2 text-body-sm"
              style={{
                borderColor: 'rgba(194, 65, 12, 0.28)',
                background: 'rgba(194, 65, 12, 0.06)',
                color: 'var(--ew-accent-strong)',
              }}
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xs border px-4 py-2 text-body-sm font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground/70"
              style={{ borderColor: 'var(--ew-line)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xs bg-[#cc785c] px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader size={1} className="h-4 w-4" />
                  Creating...
                </span>
              ) : (
                'Create user'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
