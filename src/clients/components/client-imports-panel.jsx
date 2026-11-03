import Loader from '../../appcomponents/loader.jsx'
import ClientImportCard from './client-import-card.jsx'

export default function ClientImportsPanel({
  imports,
  loading,
  error,
  canDelete,
  deletingImports,
  onDelete,
  onViewClients,
}) {
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading client imports">
        <Loader size={2.2} />
      </div>
    )
  }

  if (error) {
    return (
      <p
        className="rounded-control border px-4 py-8 text-center text-sm text-danger-strong"
        role="alert"
        style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
      >
        {error}
      </p>
    )
  }

  if (imports.length > 0) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {imports.map((clientImport) => (
          <ClientImportCard
            key={clientImport.id}
            clientImport={clientImport}
            canDelete={canDelete}
            isDeleting={Object.prototype.hasOwnProperty.call(deletingImports, clientImport.id)}
            deleteProgress={deletingImports[clientImport.id] || 0}
            onDelete={onDelete}
            onViewClients={onViewClients}
          />
        ))}
      </div>
    )
  }

  return (
    <p className="flex min-h-[50vh] items-center justify-center text-center text-sm text-[var(--ew-muted)] md:text-base">
      No client imports yet.
    </p>
  )
}
