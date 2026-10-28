import { useState } from 'react'
import { AlertIcon, EyeIcon, EyeOffIcon } from '../../components/icons.jsx'

function FieldError({ id, children }) {
  return (
    <p
      id={id}
      className="mt-1.5 flex items-center gap-1.5 text-meta font-medium leading-snug text-danger-strong"
    >
      <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" />
      {children}
    </p>
  )
}

function LoginForm({ onSubmit, loading }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const next = {}
    if (!email) next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email'
    if (!password) next.password = 'Password is required'
    else if (password.length < 6) next.password = 'Password must be at least 6 characters'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit?.({ email, password })
  }

  const fieldClass = (invalid) =>
    `h-11 w-full rounded-control border bg-surface px-3.5 text-body text-ink shadow-field outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted focus:ring-4 ${
      invalid
        ? 'border-danger/60 focus:border-danger focus:ring-danger/15'
        : 'border-field/80 hover:border-field focus:border-accent focus:ring-accent/15'
    }`

  return (
    <form onSubmit={handleSubmit} noValidate aria-busy={loading} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-meta font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={fieldClass(Boolean(errors.email))}
          placeholder="you@company.com"
        />
        {errors.email && <FieldError id="email-error">{errors.email}</FieldError>}
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-meta font-medium text-ink">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className={`${fieldClass(Boolean(errors.password))} pr-11`}
            placeholder="Enter your password"
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
        {errors.password && <FieldError id="password-error">{errors.password}</FieldError>}
      </div>

      <div className="flex items-center justify-between gap-4">
        <label className="flex cursor-pointer select-none items-center gap-2.5 text-meta text-ink/80">
          <input
            type="checkbox"
            className="h-[1.05rem] w-[1.05rem] shrink-0 rounded-xs accent-accent outline-none focus-visible:ring-4 focus-visible:ring-accent/15"
          />
          Remember me
        </label>
        <a
          href="#"
          className="text-meta font-medium text-ink/80 underline-offset-2 outline-none transition-colors hover:text-accent hover:underline focus-visible:rounded focus-visible:ring-4 focus-visible:ring-accent/15"
        >
          Forgot password?
        </a>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-control bg-[#cc785c] px-4 text-body font-semibold text-white shadow-[0_1px_2px_rgba(27,26,24,0.24)] outline-none transition-[transform,background-color,box-shadow] duration-150 hover:bg-[#cc785c]/90 focus-visible:ring-4 focus-visible:ring-accent/25 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:active:translate-y-0"
      >
        {loading ? (
          <>
            <span
              className="h-4 w-4 animate-spin rounded-pill border-2 border-white/30 border-t-white"
              aria-hidden="true"
            />
            Signing in...
          </>
        ) : (
          'Sign in'
        )}
      </button>
    </form>
  )
}

export default LoginForm
