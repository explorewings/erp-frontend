import { useEffect, useState } from 'react'
import { LuPlus } from 'react-icons/lu'
import { useAuth } from '../../authetication/auth-context.js'
import Alert from '../../appcomponents/alert.jsx'
import Loader from '../../appcomponents/loader.jsx'
import Toast from '../../appcomponents/toast.jsx'
import AddClient from '../components/add-client.jsx'
import ClientDetails from '../components/client-details.jsx'
import ClientsTable from '../components/clients-table.jsx'
import { deleteClient, fetchClients } from '../api.js'

const LIMIT = 100

export default function Clients() {
  const { token, user } = useAuth()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientToDelete, setClientToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [toast, setToast] = useState(null)
  const canCreate = user?.role === 'superadmin' || user?.role === 'superuser'

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  useEffect(() => {
    if (!token) return undefined
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchClients(token, { search: debouncedSearch, page, limit: LIMIT })
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
  }, [token, debouncedSearch, page, refreshKey])

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

  const handleUpdateClient = (updatedClient) => {
    setItems((current) => current.map((client) => client.id === updatedClient.id ? updatedClient : client))
    setSelectedClient(updatedClient)
  }

  return (
    <>
      <section className="relative flex min-h-0 flex-1 flex-col gap-4">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search clients..."
            aria-label="Search clients"
            className="w-full rounded-xs border px-3.5 py-2.5 text-body-sm text-[var(--ew-ink)] outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15 sm:w-64"
            style={{ borderColor: 'var(--ew-field-line)', background: 'var(--ew-surface)' }}
          />
          {canCreate && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              aria-label="Add client"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e]"
            >
              <LuPlus className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl p-0 pb-28 md:p-4 md:pb-4">
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
          </div>
        </div>

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
      <Toast open={!!toast} message={toast?.message} type={toast?.type} onClose={() => setToast(null)} centerWithinMain />
    </>
  )
}
