import { useEffect, useRef, useState } from 'react'
import { LuCheck, LuFilter, LuPlus, LuSearch } from 'react-icons/lu'
import { useAuth } from '../../authetication/auth-context.js'
import Alert from '../../appcomponents/alert.jsx'
import Loader from '../../appcomponents/loader.jsx'
import Toast from '../../appcomponents/toast.jsx'
import Tooltip from '../../appcomponents/tooltip.jsx'
import AddClient from '../components/add-client.jsx'
import ClientCards from '../components/client-cards.jsx'
import ClientDetails from '../components/client-details.jsx'
import ClientImportCard from '../components/client-import-card.jsx'
import ClientImportModal from '../components/client-import-modal.jsx'
import ClientSearchModal from '../components/client-search-modal.jsx'
import ClientsTable from '../components/clients-table.jsx'
import {
  deleteClient,
  deleteClientImport,
  deleteImportedClientsBatch,
  fetchClientImports,
  fetchClients,
} from '../api.js'

const LIMIT = 100
const TABS = [
  { id: 'clients', label: 'Clients' },
  { id: 'imports', label: 'Imports' },
]

export default function Clients() {
  const { token, user } = useAuth()
  const [activeTab, setActiveTab] = useState('clients')
  const [selectedImportId, setSelectedImportId] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [importRefreshKey, setImportRefreshKey] = useState(0)
  const [items, setItems] = useState([])
  const [clientImports, setClientImports] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [importsLoading, setImportsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [importsError, setImportsError] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientToDelete, setClientToDelete] = useState(null)
  const [importToDelete, setImportToDelete] = useState(null)
  const [deletingImports, setDeletingImports] = useState({})
  const [isDeleting, setIsDeleting] = useState(false)
  const [toast, setToast] = useState(null)
  const addMenuRef = useRef(null)
  const filterMenuRef = useRef(null)
  const resultsScrollRef = useRef(null)
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 })
  const tabRefs = useRef([])
  const canCreate = user?.role === 'superadmin' || user?.role === 'superuser'

  useEffect(() => {
    const update = () => {
      const index = TABS.findIndex((tab) => tab.id === activeTab)
      const node = tabRefs.current[index]
      if (!node) return
      setSliderStyle({ left: node.offsetLeft, width: node.offsetWidth })
    }

    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [activeTab])

  useEffect(() => {
    if (!isAddMenuOpen && !isFilterMenuOpen) return undefined

    const handlePointerDown = (event) => {
      if (!addMenuRef.current?.contains(event.target)) setIsAddMenuOpen(false)
      if (!filterMenuRef.current?.contains(event.target)) setIsFilterMenuOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsAddMenuOpen(false)
      if (event.key === 'Escape') setIsFilterMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isAddMenuOpen, isFilterMenuOpen])

  useEffect(() => {
    resultsScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeTab, page])

  useEffect(() => {
    if (!token) return undefined
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchClients(token, { page, limit: LIMIT, importId: selectedImportId })
      .then((data) => {
        if (cancelled) return
        setItems(Array.isArray(data?.items) ? data.items : [])
        setTotal(Number(data?.total) || 0)
        setTotalPages(Math.max(1, Number(data?.totalPages) || 1))
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Unable to load clients.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, page, refreshKey, selectedImportId])

  useEffect(() => {
    if (!token) return undefined

    let cancelled = false
    setImportsLoading(true)
    setImportsError(null)
    fetchClientImports(token)
      .then((data) => {
        if (!cancelled) setClientImports(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (!cancelled) setImportsError(err?.message || 'Unable to load client imports.')
      })
      .finally(() => {
        if (!cancelled) setImportsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, importRefreshKey])

  const handleDeleteClient = async () => {
    if (!clientToDelete || !token) return
    setIsDeleting(true)
    try {
      await deleteClient(token, clientToDelete.id)
      setItems((current) => current.filter((client) => client.id !== clientToDelete.id))
      const nextTotal = Math.max(0, total - 1)
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / LIMIT))
      setTotal(nextTotal)
      setTotalPages(nextTotalPages)
      if (page > nextTotalPages) setPage(nextTotalPages)
      if (selectedClient?.id === clientToDelete.id) setSelectedClient(null)
      setToast({ message: 'Client deleted', type: 'success' })
      setClientToDelete(null)
    } catch (err) {
      setToast({ message: err?.message || 'Unable to delete client.', type: 'error' })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteImport = async () => {
    if (!importToDelete || !token) return

    const target = importToDelete
    const importId = target.id
    setImportToDelete(null)
    setDeletingImports((current) => ({ ...current, [importId]: 0 }))

    try {
      let deletedCount = 0
      let remainingCount = null
      let totalToDelete = null

      do {
        const result = await deleteImportedClientsBatch(token, importId)
        const deletedInBatch = Number(result?.deletedCount)
        const remainingInResponse = Number(result?.remainingCount)
        if (
          !Number.isInteger(deletedInBatch) ||
          deletedInBatch < 0 ||
          !Number.isInteger(remainingInResponse) ||
          remainingInResponse < 0
        ) {
          throw new Error('The server returned invalid client deletion progress.')
        }
        if (deletedInBatch === 0 && remainingInResponse > 0) {
          throw new Error('Client deletion did not make progress. Please try again.')
        }

        deletedCount += deletedInBatch
        remainingCount = remainingInResponse
        if (totalToDelete === null) totalToDelete = deletedCount + remainingCount
        const progress = remainingCount === 0
          ? 100
          : totalToDelete > 0
            ? Math.min(99, (deletedCount / totalToDelete) * 100)
            : 0
        setDeletingImports((current) => ({ ...current, [importId]: progress }))
      } while (remainingCount > 0)

      await deleteClientImport(token, importId)
      setClientImports((current) => current.filter((entry) => entry.id !== importId))
      if (selectedImportId === importId) setSelectedImportId(null)
      setRefreshKey((current) => current + 1)
      setToast({ message: `Import "${target.name}" and its clients deleted`, type: 'success' })
    } catch (err) {
      setToast({ message: err?.message || 'Unable to delete this client import.', type: 'error' })
      setImportRefreshKey((current) => current + 1)
    } finally {
      setDeletingImports((current) => {
        const next = { ...current }
        delete next[importId]
        return next
      })
    }
  }

  const handleUpdateClient = (updatedClient) => {
    setItems((current) => current.map((client) => client.id === updatedClient.id ? updatedClient : client))
    setSelectedClient(updatedClient)
  }

  return (
    <>
      <section className="relative flex min-h-0 flex-1 flex-col gap-4">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 md:px-4">
          <div
            className="relative inline-flex rounded-lg border p-1"
            role="tablist"
            aria-label="Client views"
            style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
          >
            <div
              className="absolute inset-y-1 rounded-xs bg-[#cc785c] transition-all duration-300 ease-out"
              style={{ left: sliderStyle.left, width: sliderStyle.width }}
            />
            {TABS.map((tab, index) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  ref={(node) => {
                    tabRefs.current[index] = node
                  }}
                  id={`clients-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`clients-panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative z-10 whitespace-nowrap rounded-xs px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
                    isActive ? 'text-white' : 'text-[var(--ew-muted)]'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {activeTab === 'clients' && (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search clients"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e]"
              >
                <LuSearch className="h-4 w-4" />
              </button>
            )}
            {canCreate && (
              <div className="relative shrink-0" ref={addMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsFilterMenuOpen(false)
                    setIsAddMenuOpen((open) => !open)
                  }}
                  aria-label="Add client options"
                  aria-haspopup="menu"
                  aria-expanded={isAddMenuOpen}
                  className="flex h-10 w-10 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e]"
                >
                  <LuPlus className="h-4 w-4" />
                </button>
                {isAddMenuOpen && (
                  <div
                    role="menu"
                    aria-label="Client actions"
                    className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-control border bg-surface py-1 shadow-panel"
                    style={{ borderColor: 'var(--ew-line)' }}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsAddMenuOpen(false)
                        setAddOpen(true)
                      }}
                      className="flex w-full items-center px-4 py-2.5 text-left text-sm text-[var(--ew-ink)] transition-colors hover:bg-ground/70"
                    >
                      Add client
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsAddMenuOpen(false)
                        setImportOpen(true)
                      }}
                      className="flex w-full items-center px-4 py-2.5 text-left text-sm text-[var(--ew-ink)] transition-colors hover:bg-ground/70"
                    >
                      Import data
                    </button>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'clients' && (
              <div className="relative shrink-0" ref={filterMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddMenuOpen(false)
                    setIsFilterMenuOpen((open) => !open)
                  }}
                  aria-label="Filter clients by import"
                  aria-haspopup="menu"
                  aria-expanded={isFilterMenuOpen}
                  className="flex h-10 w-10 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e]"
                >
                  <LuFilter className="h-4 w-4" />
                </button>
                {isFilterMenuOpen && (
                  <div
                    className="absolute right-0 z-30 mt-2 max-h-72 w-64 overflow-y-auto rounded-control border bg-surface py-1 shadow-panel"
                    style={{ borderColor: 'var(--ew-line)' }}
                    role="menu"
                    aria-label="Filter clients by import"
                  >
                    {importsLoading ? (
                      <p className="px-4 py-3 text-sm text-[var(--ew-muted)]">Loading imports...</p>
                    ) : importsError ? (
                      <p className="px-4 py-3 text-sm text-danger-strong" role="alert">{importsError}</p>
                    ) : clientImports.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-[var(--ew-muted)]">No imports yet</p>
                    ) : (
                      <>
                        <button
                          type="button"
                          role="menuitemradio"
                          aria-checked={selectedImportId === null}
                          onClick={() => {
                            setSelectedImportId(null)
                            setPage(1)
                            setIsFilterMenuOpen(false)
                          }}
                          className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-ground/70 ${
                            selectedImportId === null
                              ? 'bg-accent-soft font-medium text-accent-strong'
                              : 'text-[var(--ew-ink)]'
                          }`}
                        >
                          All clients
                          {selectedImportId === null && <LuCheck className="h-4 w-4 shrink-0" aria-hidden="true" />}
                        </button>
                        {clientImports.map((clientImport) => (
                          <Tooltip
                            key={clientImport.id}
                            content={clientImport.name}
                            className="block min-w-0"
                          >
                            <button
                              type="button"
                              role="menuitemradio"
                              aria-checked={selectedImportId === clientImport.id}
                              aria-label={clientImport.name}
                              onClick={() => {
                                setSelectedImportId(clientImport.id)
                                setPage(1)
                                setIsFilterMenuOpen(false)
                              }}
                              className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-ground/70 ${
                                selectedImportId === clientImport.id
                                  ? 'bg-accent-soft font-medium text-accent-strong'
                                  : 'text-[var(--ew-ink)]'
                              }`}
                            >
                              <span className="truncate">{clientImport.name}</span>
                              {selectedImportId === clientImport.id && (
                                <LuCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                              )}
                            </button>
                          </Tooltip>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          ref={resultsScrollRef}
          className="relative min-h-0 flex-1 overflow-y-auto"
          aria-busy={activeTab === 'clients' ? loading : importsLoading}
        >
          <div className={(activeTab === 'clients' ? loading : importsLoading) ? 'blur-sm' : ''}>
            <div className="mx-auto w-full max-w-6xl p-0 pb-28 md:p-4 md:pb-4">
              {activeTab === 'clients' ? (
                <section id="clients-panel-clients" role="tabpanel" aria-labelledby="clients-tab-clients">
                  <ClientsTable
                    clients={items}
                    loading={loading}
                    error={error}
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    onPrevious={() => setPage((current) => Math.max(1, current - 1))}
                    onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
                    onView={setSelectedClient}
                    onDelete={setClientToDelete}
                    canManage={canCreate}
                  />
                  <ClientCards
                    clients={items}
                    loading={loading}
                    error={error}
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    onPrevious={() => setPage((current) => Math.max(1, current - 1))}
                    onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
                    onView={setSelectedClient}
                    onDelete={setClientToDelete}
                    canManage={canCreate}
                  />
                </section>
              ) : (
                <section id="clients-panel-imports" role="tabpanel" aria-labelledby="clients-tab-imports">
                  {importsError ? (
                    <p className="rounded-control border px-4 py-8 text-center text-sm text-danger-strong" role="alert" style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}>
                      {importsError}
                    </p>
                  ) : clientImports.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {clientImports.map((clientImport) => (
                        <ClientImportCard
                          key={clientImport.id}
                          clientImport={clientImport}
                          canDelete={canCreate}
                          isDeleting={Object.prototype.hasOwnProperty.call(deletingImports, clientImport.id)}
                          deleteProgress={deletingImports[clientImport.id] || 0}
                          onDelete={setImportToDelete}
                          onViewClients={(entry) => {
                            setSelectedImportId(entry.id)
                            setPage(1)
                            setActiveTab('clients')
                          }}
                        />
                      ))}
                    </div>
                  ) : !importsLoading ? (
                    <p className="flex min-h-[50vh] items-center justify-center text-center text-sm text-[var(--ew-muted)] md:text-base">
                      No client imports yet.
                    </p>
                  ) : null}
                </section>
              )}
            </div>
          </div>
          {activeTab === 'clients' && loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--ew-surface)]/45 backdrop-blur-[1px]" role="status" aria-label="Loading clients">
              <Loader size={2.2} />
            </div>
          )}
        </div>

        {activeTab === 'imports' && importsLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--ew-surface)]/45 backdrop-blur-[1px]" role="status" aria-label="Loading client imports">
            <Loader size={2.2} />
          </div>
        )}

        <AddClient
          open={addOpen}
          token={token}
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            setPage(1)
            setRefreshKey((current) => current + 1)
            setToast({ message: 'Client added', type: 'success' })
          }}
        />
        <ClientImportModal
          open={importOpen}
          token={token}
          onClose={() => setImportOpen(false)}
          onImported={({ name, importedRows }) => {
            setPage(1)
            setRefreshKey((current) => current + 1)
            setImportRefreshKey((current) => current + 1)
            setActiveTab('imports')
            setToast({ message: `${importedRows} clients imported as "${name}"`, type: 'success' })
          }}
        />
        <ClientSearchModal
          open={searchOpen}
          token={token}
          onClose={() => setSearchOpen(false)}
          onSelect={(client) => {
            setSearchOpen(false)
            setSelectedClient(client)
          }}
        />
      </section>
      <ClientDetails
        client={selectedClient}
        token={token}
        onClose={() => setSelectedClient(null)}
        onDelete={setClientToDelete}
        onUpdated={handleUpdateClient}
        onNotify={(message) => setToast({ message, type: 'success' })}
        canDelete={canCreate}
      />
      <Alert
        open={!!clientToDelete}
        title="Delete client?"
        description={`This will permanently delete ${clientToDelete?.name || 'this client'} and cannot be undone.`}
        confirmLabel="Delete"
        isConfirming={isDeleting}
        onConfirm={handleDeleteClient}
        onCancel={() => {
          if (!isDeleting) setClientToDelete(null)
        }}
      />
      <Alert
        open={!!importToDelete}
        title="Delete client import?"
        description={`This will permanently delete "${importToDelete?.name || 'this import'}" and all clients created from it. This cannot be undone.`}
        confirmLabel="Delete import"
        onConfirm={handleDeleteImport}
        onCancel={() => setImportToDelete(null)}
      />
      <Toast open={!!toast} message={toast?.message} type={toast?.type} onClose={() => setToast(null)} centerWithinMain />
    </>
  )
}
