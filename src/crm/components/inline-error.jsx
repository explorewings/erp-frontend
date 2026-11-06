/** Error box used across the CRM screens. */
export default function InlineError({ children, className = '' }) {
  if (!children) return null
  return (
    <div
      role="alert"
      className={`rounded-control border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger ${className}`}
    >
      {children}
    </div>
  )
}
