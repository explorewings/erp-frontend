import { useEffect, useRef, useState } from 'react'
import { createUser } from '../api.js'
import Loader from '../../appcomponents/loader.jsx'
import { EyeIcon, EyeOffIcon } from '../../components/icons.jsx'
import { NAV_ITEMS } from '../../erplayout/nav.js'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'staff', label: 'Staff' },
]

export default function CreateUserModal({
  open,
  token,
  accessItems = [],
  accessItemsLoading = false,
  accessItemsError = null,
  onClose,
  onCreated,
}) {
  const [form, setForm] = useState({
    username: '',
    email: '',
    role: 'staff',
    password: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const onCloseRef = useRef(onClose)
  const ignorePopRef = useRef(false)
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState(1)
  const [selectedCodes, setSelectedCodes] = useState([])
  const permissionsInitializedRef = useRef(false)
  onCloseRef.current = onClose

  useEffect(() => {
    if (open) {
      setForm({ username: '', email: '', role: 'staff', password: '' })
      setStep(1)
      setSelectedCodes([])
      setShowPassword(false)
      permissionsInitializedRef.current = false
      setError(null)
    } else {
      permissionsInitializedRef.current = false
    }
  }, [open])

  useEffect(() => {
    if (
      !open ||
      permissionsInitializedRef.current ||
      accessItemsLoading ||
      accessItemsError ||
      accessItems.length === 0
    ) {
      return
    }

    setSelectedCodes(
      accessItems
        .filter((item) => item.code !== 'menu:settings')
        .map((item) => item.code),
    )
    permissionsInitializedRef.current = true
  }, [open, accessItems, accessItemsLoading, accessItemsError])

  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') closeOverlay()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const closeOverlay = () => {
    ignorePopRef.current = true
    onCloseRef.current?.()
    if (window.history.state?.overlay) {
      window.history.back()
    } else {
      ignorePopRef.current = false
    }
  }

  useEffect(() => {
    if (!open) return undefined
    const onPopState = () => {
      if (ignorePopRef.current) {
        ignorePopRef.current = false
        return
      }
      onCloseRef.current?.()
    }
    window.history.pushState({ overlay: true }, '', window.location.href)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [open])

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  if (!open) return null

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const availableAccessItems = accessItems.filter((item) => item.code !== 'menu:settings')
  const allPermissionsSelected =
    availableAccessItems.length > 0 &&
    selectedCodes.length === availableAccessItems.length
  const canCreate =
    !accessItemsLoading &&
    !accessItemsError &&
    availableAccessItems.length > 0

  const updatePermission = (code, checked) => {
    setSelectedCodes((current) => {
      const next = new Set(current)
      if (checked) next.add(code)
      else next.delete(code)
      return [...next]
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (step === 1) {
      setStep(2)
      setError(null)
      return
    }

    if (accessItemsLoading || accessItemsError || availableAccessItems.length === 0) {
      setError(accessItemsError || 'No active menu permissions are available.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const created = await createUser(token, {
        username: form.username.trim(),
        email: form.email.trim(),
        role: form.role,
        password: form.password,
        accessCodes: selectedCodes,
      })
      onCreated(created)
      closeOverlay()
    } catch (err) {
      setError(err?.message || 'Unable to create user.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const roleTabs = (
    <div
      className="inline-flex rounded-lg border p-1"
      style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
    >
      {ROLE_OPTIONS.map((option) => {
        const isActive = form.role === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, role: option.value }))}
            className={`${
              isActive ? 'rounded-xs' : 'rounded-lg'
            } px-4 py-1.5 text-sm font-medium transition-all duration-300 ease-out`}
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
  const fieldStyle = {
    borderColor: 'var(--ew-field-line)',
    background: 'var(--ew-surface)',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-user-title"
    >
      <div
        className="relative flex h-[19rem] max-h-[90vh] w-full max-w-md flex-col rounded-control border p-6 shadow-2xl ring-1 ring-[var(--ew-line)]"
        style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
      >
        <div className="flex shrink-0 items-center justify-between gap-4">
          <div>
            <h2 id="create-user-title" className="text-title text-[var(--ew-ink)]">
              {step === 1 ? 'Create user' : 'Permissions'}
            </h2>
          </div>
          {step === 1 ? (
            roleTabs
          ) : (
            <div
              className="inline-flex shrink-0 rounded-lg border p-1"
              style={{
                borderColor: 'var(--ew-line)',
                background: 'var(--ew-surface)',
              }}
              role="group"
              aria-label="Select menu permissions"
            >
              <button
                type="button"
                onClick={() =>
                  setSelectedCodes(availableAccessItems.map((item) => item.code))
                }
                aria-pressed={allPermissionsSelected}
                disabled={accessItemsLoading || availableAccessItems.length === 0}
                className={`rounded-xs px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                  allPermissionsSelected
                    ? 'bg-[#cc785c] text-white'
                    : 'text-[var(--ew-muted)] hover:bg-ground'
                }`}
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setSelectedCodes([])}
                aria-pressed={selectedCodes.length === 0}
                disabled={accessItemsLoading || availableAccessItems.length === 0}
                className={`rounded-xs px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                  selectedCodes.length === 0
                    ? 'bg-[#cc785c] text-white'
                    : 'text-[var(--ew-muted)] hover:bg-ground'
                }`}
              >
                Deselect all
              </button>
            </div>
          )}
        </div>

        <form className="mt-5 flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div
            className={`flex min-h-0 flex-1 flex-col ${
              step === 2 ? 'overflow-hidden' : 'overflow-y-auto'
            }`}
          >
            {step === 1 ? (
              <div className="space-y-4">
                <div>
                  <label
                    className="block text-label font-medium text-[var(--ew-muted)]"
                    htmlFor="cu-username"
                  >
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
                  <label
                    className="block text-label font-medium text-[var(--ew-muted)]"
                    htmlFor="cu-email"
                  >
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
                  <label
                    className="block text-label font-medium text-[var(--ew-muted)]"
                    htmlFor="cu-password"
                  >
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
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xs text-muted outline-none transition-colors hover:text-ink focus-visible:ring-4 focus-visible:ring-accent/15"
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                {accessItemsLoading ? (
                  <div className="flex min-h-40 items-center justify-center">
                    <Loader />
                  </div>
                ) : accessItemsError ? (
                  <div
                    role="alert"
                    className="rounded-xs border px-3 py-2 text-body-sm"
                    style={{
                      borderColor: 'rgba(194,65,12,.28)',
                      background: 'rgba(194,65,12,.06)',
                      color: 'var(--ew-accent-strong)',
                    }}
                  >
                    {accessItemsError}
                  </div>
                ) : availableAccessItems.length === 0 ? (
                  <div
                    className="rounded-xs border px-3 py-2 text-body-sm text-[var(--ew-muted)]"
                    style={{ borderColor: 'var(--ew-line)' }}
                  >
                    No active menu permissions are available.
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col gap-2">
                    <div className="max-h-[300px] min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                      {availableAccessItems.map((item) => {
                        const menu = NAV_ITEMS.find((entry) => entry.key === item.code)
                        const Icon = menu?.Icon
                        const checked = selectedCodes.includes(item.code)
                        return (
                          <label
                            key={item.code}
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                              checked
                                ? 'border-[#cc785c] bg-[#cc785c]/5'
                                : 'hover:bg-ground/70'
                            }`}
                            style={{
                              borderColor: checked ? '#cc785c' : 'var(--ew-line)',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                updatePermission(item.code, event.target.checked)
                              }
                              className="mt-1 h-4 w-4 accent-[#cc785c]"
                            />
                            {Icon && (
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs bg-[#cc785c] text-white">
                                <Icon className="h-4 w-4" />
                              </span>
                            )}
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-[var(--ew-ink)]">
                                {item.name}
                              </span>
                              {(item.description || menu?.description) && (
                                <span className="mt-0.5 block text-xs text-[var(--ew-muted)]">
                                  {item.description || menu.description}
                                </span>
                              )}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="mt-3 rounded-xs border px-3 py-2 text-body-sm"
              style={{
                borderColor: 'rgba(194, 65, 12, 0.28)',
                background: 'rgba(194, 65, 12, 0.06)',
                color: 'var(--ew-accent-strong)',
              }}
            >
              {error}
            </div>
          )}

          <div className="mt-4 flex shrink-0 justify-end gap-2 border-t border-[var(--ew-line)] pt-4">
            <button
              type="button"
              onClick={
                step === 2
                  ? () => {
                      setStep(1)
                      setError(null)
                    }
                  : closeOverlay
              }
              disabled={isSubmitting}
              className="rounded-xs border px-4 py-2 text-body-sm font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground/70"
              style={{ borderColor: 'var(--ew-line)' }}
            >
              {step === 2 ? 'Back' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (step === 2 && !canCreate)}
              className="rounded-xs bg-[#cc785c] px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader size={1} className="h-4 w-4" />
                  Creating user...
                </span>
              ) : step === 1 ? (
                'Next'
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
