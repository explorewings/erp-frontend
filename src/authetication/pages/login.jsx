import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LoginForm from '../components/login form.jsx'
import { useAuth } from '../auth-context.js'
import { AlertIcon, CheckIcon } from '../../components/icons.jsx'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (credentials) => {
    setLoading(true)
    setMessage(null)
    try {
      const { user } = await login(credentials)
      setMessage({ type: 'success', text: `Welcome back, ${user.username}.` })
      navigate('/erp/calendar', { replace: true })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Something went wrong. Try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="ew-ground flex min-h-screen items-center justify-center px-5 py-12 sm:px-6">
      <div className="w-full max-w-[25.5rem]">
        <header className="ew-rise mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xs border border-line bg-surface shadow-[0_1px_2px_rgba(27,26,24,0.06)]">
            <img
              src="/images/ewlogo.png"
              alt=""
              aria-hidden="true"
              className="h-7 w-7 object-contain"
            />
          </span>
          <span className="text-title font-semibold tracking-[-0.01em] text-ink">
            Explore Wings
          </span>
        </header>

        <div className="ew-rise mb-7">
          <h1 className="text-balance text-display font-semibold leading-[1.18] tracking-[-0.022em] text-ink">
            Sign in to your account
          </h1>
          <p className="mt-2.5 max-w-[36ch] text-body leading-relaxed text-muted">
            Manage your ERP workspace in one secure place.
          </p>
        </div>

        <div className="ew-rise rounded-panel border border-line bg-surface p-6 shadow-panel sm:p-7">
          <LoginForm onSubmit={handleSubmit} loading={loading} />

          {message && (
            <div
              role="status"
              className={`mt-5 flex items-start gap-2.5 rounded-control border px-3.5 py-3 text-body-sm leading-snug ${
                message.type === 'success'
                  ? 'border-success-line bg-success-soft text-success'
                  : 'border-danger/25 bg-danger-soft text-danger-strong'
              }`}
            >
              {message.type === 'success' ? (
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}
        </div>

        <p className="ew-rise mt-7 text-center text-meta leading-relaxed text-muted">
          By continuing, you agree to our{' '}
          <a
            href="#"
            className="font-medium text-ink underline decoration-line underline-offset-2 transition-colors hover:text-accent hover:decoration-accent/40"
          >
            Terms
          </a>{' '}
          and{' '}
          <a
            href="#"
            className="font-medium text-ink underline decoration-line underline-offset-2 transition-colors hover:text-accent hover:decoration-accent/40"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </main>
  )
}
