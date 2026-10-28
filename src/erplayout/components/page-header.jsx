export default function PageHeader({ title, lead, actions }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-balance text-heading font-semibold tracking-[-0.022em] text-ink">
          {title}
        </h1>
        {lead && (
          <p className="mt-1.5 max-w-[62ch] text-body leading-relaxed text-muted">
            {lead}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}
