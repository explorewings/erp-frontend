import { useEffect, useRef, useState } from 'react'
import { LuArrowRight, LuCheck, LuChevronDown, LuChevronRight, LuFilter, LuPlus, LuSearch, LuTrash2, LuX } from 'react-icons/lu'
import { useAuth } from '../../authetication/auth-context.js'
import Alert from '../../appcomponents/alert.jsx'
import Loader from '../../appcomponents/loader.jsx'
import Toast from '../../appcomponents/toast.jsx'
import Tooltip from '../../appcomponents/tooltip.jsx'
import AddClient from '../components/add-client.jsx'
import BulkClientDeleteDialog from '../components/bulk-client-delete-dialog.jsx'
import ClientCards from '../components/client-cards.jsx'
import ClientDetails from '../components/client-details.jsx'
import ClientImportsPanel from '../components/client-imports-panel.jsx'
import ClientImportModal from '../components/client-import-modal.jsx'
import ClientSearchModal from '../components/client-search-modal.jsx'
import ClientToPipeline from '../components/client-to-pipeline.jsx'
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
  const [isSelectionMenuOpen, setIsSelectionMenuOpen] = useState(false)
  const [selectionMenuLeft, setSelectionMenuLeft] = useState(0)
  const [isImportSelectorExpanded, setIsImportSelectorExpanded] = useState(false)
  const [selectedClientIds, setSelectedClientIds] = useState(() => new Set())
  const [selectedImports, setSelectedImports] = useState({})
  // Live totals for the SELECTED imports only (limit-1 queries). The imports
  // list's clientCount can be stale/zero in a session; the Select (N) count
  // must reflect the true number of clients the selection contains.
  const [liveImportCounts, setLiveImportCounts] = useState({})
  // Server-side search field inside the Select dropdown (same endpoint and
  // 300ms debounce as the search modal). Matches render in the main Clients
  // table / mobile cards below, where the user ticks them — the modal cannot
  // be summoned while in selection state, so this drives the table directly.
  const [selectionSearch, setSelectionSearch] = useState('')
  const [debouncedSelectionSearch, setDebouncedSelectionSearch] = useState('')
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [clientToPipelineOpen, setClientToPipelineOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientToDelete, setClientToDelete] = useState(null)
  const [importToDelete, setImportToDelete] = useState(null)
  const [deletingImports, setDeletingImports] = useState({})
  const [isDeleting, setIsDeleting] = useState(false)
  const [toast, setToast] = useState(null)
  const addMenuRef = useRef(null)
  const filterMenuRef = useRef(null)
  const selectionMenuRef = useRef(null)
  const resultsScrollRef = useRef(null)
  const knownClientsRef = useRef(new Map())
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
    if (!isAddMenuOpen && !isFilterMenuOpen && !isSelectionMenuOpen) return undefined

    const handlePointerDown = (event) => {
      if (!addMenuRef.current?.contains(event.target)) setIsAddMenuOpen(false)
      if (!filterMenuRef.current?.contains(event.target)) setIsFilterMenuOpen(false)
      // Deliberately NO outside-click close for the Select dropdown: the user
      // ticks results in the table (below/outside the menu) while searching,
      // and dismissing on those clicks ate the selection. It closes via the
      // Select toggle, Escape, Clear selection, or CRM/Delete.
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsAddMenuOpen(false)
      if (event.key === 'Escape') setIsFilterMenuOpen(false)
      if (event.key === 'Escape') setIsSelectionMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isAddMenuOpen, isFilterMenuOpen, isSelectionMenuOpen])

  useEffect(() => {
    resultsScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeTab, page])

  useEffect(() => {
    if (!token) return undefined
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchClients(token, { page, limit: LIMIT, importId: selectedImportId, search: debouncedSelectionSearch || undefined })
      .then((data) => {
        if (cancelled) return
        const nextItems = Array.isArray(data?.items) ? data.items : []
        nextItems.forEach((client) => knownClientsRef.current.set(client.id, client))
        setItems(nextItems)
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
  }, [token, page, refreshKey, selectedImportId, debouncedSelectionSearch])

  // A new search starts from page 1 of the results (like the search modal).
  useEffect(() => {
    setPage(1)
  }, [debouncedSelectionSearch])

  // Debounce the dropdown search input (300ms, like the search modal).
  // The search PERSISTS after the menu closes (like a filter): closing the
  // menu on an outside click must not clear it, otherwise the table snaps
  // back to unfiltered and the row the user clicked disappears before the
  // tick registers. It clears only via the input's clear button or
  // "Clear selection".
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSelectionSearch(selectionSearch.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [selectionSearch])

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

  const selectedImportIds = new Set(Object.keys(selectedImports).map(Number))
  const actionableSelectedClientIds = [...selectedClientIds].filter((id) => {
    const client = knownClientsRef.current.get(id)
    return !client?.importId || !selectedImportIds.has(client.importId)
  })
  const selectedImportIdsKey = Object.keys(selectedImports).sort().join(',')
  useEffect(() => {
    if (!token || !selectedImportIdsKey) return undefined
    let cancelled = false
    const ids = selectedImportIdsKey.split(',').map(Number)
    Promise.all(
      ids.map(async (importId) => {
        try {
          const data = await fetchClients(token, { page: 1, limit: 1, importId })
          return [importId, Number(data?.total) || 0]
        } catch {
          return [importId, null]
        }
      })
    ).then((entries) => {
      if (cancelled) return
      setLiveImportCounts(Object.fromEntries(entries.filter(([, count]) => count !== null)))
    })
    return () => {
      cancelled = true
    }
  }, [token, selectedImportIdsKey])

  const selectedCount = actionableSelectedClientIds.length
    + Object.values(selectedImports).reduce(
      (sum, clientImport) => sum + ((liveImportCounts[clientImport.id] ?? Number(clientImport.clientCount ?? clientImport.importedRows)) || 0),
      0,
    )
  const selectedImportRecords = Object.values(selectedImports)
  // Selecting an import IS a selection, even when its current client count is
  // 0 (e.g. a failed import). Visibility must not depend on the count alone,
  // otherwise ticking such an import makes the action buttons vanish.
  const hasSelection = actionableSelectedClientIds.length > 0 || selectedImportRecords.length > 0
  const isClientSelected = (client) =>
    selectedClientIds.has(client.id) || selectedImportIds.has(client.importId)

  const toggleClientSelection = (client) => {
    if (client.importId && selectedImportIds.has(client.importId)) return
    setSelectedClientIds((current) => {
      const next = new Set(current)
      if (next.has(client.id)) next.delete(client.id)
      else next.add(client.id)
      return next
    })
  }

  const selectCurrentPage = () => {
    setSelectedClientIds((current) => {
      const next = new Set(current)
      items.forEach((client) => {
        if (!client.importId || !selectedImportIds.has(client.importId)) next.add(client.id)
      })
      return next
    })
    setIsSelectionMenuOpen(false)
  }

  const positionSelectionMenu = () => {
    const trigger = selectionMenuRef.current?.querySelector('button')
    if (!trigger) return
    const triggerBounds = trigger.getBoundingClientRect()
    const wrapperBounds = selectionMenuRef.current.getBoundingClientRect()
    const menuWidth = Math.min(288, window.innerWidth - 24)
    const left = Math.max(12, Math.min(
      triggerBounds.right - menuWidth,
      window.innerWidth - menuWidth - 12,
    ))
    setSelectionMenuLeft(left - wrapperBounds.left)
  }

  const toggleImportSelection = (clientImport) => {
    if (clientImport.status === 'processing') return
    setSelectedImports((current) => {
      const next = { ...current }
      if (next[clientImport.id]) {
        delete next[clientImport.id]
      } else {
        next[clientImport.id] = clientImport
      }
      return next
    })
    setSelectedClientIds((current) => {
      const next = new Set(current)
      for (const [id, client] of knownClientsRef.current) {
        if (client.importId === clientImport.id) next.delete(id)
      }
      return next
    })
  }

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
      setImportRefreshKey((current) => current + 1)
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
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 md:gap-3 md:px-4">
          <div
            className="relative inline-flex h-8 shrink-0 rounded-lg border p-0.5 sm:h-auto sm:p-1"
            role="tablist"
            aria-label="Client views"
            style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
          >
            <div
              className="absolute inset-y-1 rounded-[3px] bg-[#cc785c] transition-all duration-300 ease-out"
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
                  onClick={() => {
                    if (tab.id !== 'clients') {
                      setSelectedClientIds(new Set())
                      setSelectedImports({})
                      setIsSelectionMenuOpen(false)
                      setImportRefreshKey((current) => current + 1)
                    }
                    setActiveTab(tab.id)
                  }}
                  className={`relative z-10 whitespace-nowrap rounded-xs px-3 py-0 text-xs font-medium transition-colors duration-200 sm:px-4 sm:py-1.5 sm:text-sm ${
                    isActive ? 'text-white' : 'text-[var(--ew-muted)]'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-3">
            {hasSelection && canCreate ? (
              <>
                <div className="relative" ref={selectionMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddMenuOpen(false)
                      setIsFilterMenuOpen(false)
                      const nextOpen = !isSelectionMenuOpen
                      if (nextOpen) positionSelectionMenu()
                      setIsSelectionMenuOpen(nextOpen)
                    }}
                    aria-haspopup="menu"
                    aria-expanded={isSelectionMenuOpen}
                    aria-label={`Selection options, ${selectedCount} selected`}
                    className="flex h-8 items-center gap-1.5 rounded-xs bg-[#cc785c] px-2.5 text-xs font-medium text-white transition-colors hover:bg-[#b36a4e] sm:h-9 sm:gap-2 sm:px-3 sm:text-sm md:h-10"
                  >
                    Select ({selectedCount})
                    <LuChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                  {isSelectionMenuOpen && (
                    <div
                      className="absolute left-[var(--selection-menu-left)] right-auto z-30 mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-control border bg-surface py-1 shadow-panel md:left-auto md:right-0 md:w-72"
                      style={{
                        borderColor: 'var(--ew-line)',
                        '--selection-menu-left': `${selectionMenuLeft}px`,
                      }}
                      role="menu"
                      aria-label="Client selection options"
                    >
                      <div className="px-2 pt-2 pb-1">
                        <div className="relative">
                          <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ew-muted)]" aria-hidden="true" />
                          <input
                            type="text"
                            role="searchbox"
                            value={selectionSearch}
                            onChange={(event) => setSelectionSearch(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') event.preventDefault()
                            }}
                            placeholder="Search clients to add..."
                            aria-label="Search clients to add to the selection"
                            className="h-9 w-full rounded-xs border bg-surface pl-9 pr-9 text-sm text-[var(--ew-ink)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                            style={{ borderColor: 'var(--ew-field-line)' }}
                          />
                          {selectionSearch ? (
                            <button
                              type="button"
                              onClick={() => setSelectionSearch('')}
                              aria-label="Clear search"
                              className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-xs text-[var(--ew-muted)] transition-colors hover:bg-ground hover:text-[var(--ew-ink)]"
                            >
                              <LuX className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {debouncedSelectionSearch ? (
                        <p className="px-4 pt-1 pb-1 text-xs text-[var(--ew-muted)]" role="status">
                          {total} result{total === 1 ? '' : 's'} in table — tick clients there. Search stays until cleared.
                        </p>
                      ) : null}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={selectCurrentPage}
                        className="w-full px-4 py-2.5 text-left text-sm text-[var(--ew-ink)] transition-colors hover:bg-ground/70"
                      >
                        Select this page ({items.length})
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        aria-expanded={isImportSelectorExpanded}
                        onClick={() => setIsImportSelectorExpanded((expanded) => !expanded)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-[var(--ew-ink)] transition-colors hover:bg-ground/70"
                      >
                        <span>Select imports</span>
                        {isImportSelectorExpanded
                          ? <LuChevronDown className="h-4 w-4 shrink-0" />
                          : <LuChevronRight className="h-4 w-4 shrink-0" />}
                      </button>
                      {isImportSelectorExpanded && (
                        <div className="border-t" style={{ borderColor: 'var(--ew-line)' }}>
                          {importsLoading ? (
                            <p className="px-4 py-3 text-sm text-[var(--ew-muted)]">Loading imports...</p>
                          ) : importsError ? (
                            <p className="px-4 py-3 text-sm text-danger-strong" role="alert">{importsError}</p>
                          ) : clientImports.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-[var(--ew-muted)]">No imports yet</p>
                          ) : (
                            <div className="max-h-52 overflow-y-auto py-1">
                              {clientImports.map((clientImport) => {
                                const checked = Boolean(selectedImports[clientImport.id])
                                const disabled = clientImport.status === 'processing'
                                return (
                                  <Tooltip
                                    key={clientImport.id}
                                    content={clientImport.name}
                                    className="block min-w-0"
                                  >
                                    <button
                                      type="button"
                                      role="menuitemcheckbox"
                                      aria-checked={checked}
                                      disabled={disabled}
                                      onClick={() => toggleImportSelection(clientImport)}
                                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[var(--ew-ink)] transition-colors hover:bg-ground/70 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        readOnly
                                        tabIndex={-1}
                                        aria-hidden="true"
                                        className="h-4 w-4 shrink-0 rounded-full accent-[#cc785c]"
                                      />
                                      <span className="min-w-0 flex-1 truncate">{clientImport.name}</span>
                                      <span className="shrink-0 text-xs text-[var(--ew-muted)]">
                                        {Number(clientImport.clientCount ?? clientImport.importedRows) || 0}
                                      </span>
                                    </button>
                                  </Tooltip>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setSelectedClientIds(new Set())
                          setSelectedImports({})
                          setSelectionSearch('')
                          setIsSelectionMenuOpen(false)
                        }}
                        className="w-full border-t px-4 py-2.5 text-left text-sm text-[var(--ew-muted)] transition-colors hover:bg-ground/70"
                        style={{ borderColor: 'var(--ew-line)' }}
                      >
                        Clear selection
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectionMenuOpen(false)
                    setClientToPipelineOpen(true)
                  }}
                  aria-label={`Add ${selectedCount} selected clients to CRM`}
                  title="Add selected clients to CRM"
                  className="flex h-8 items-center justify-center gap-1.5 rounded-xs bg-[#cc785c] px-2.5 text-xs font-medium text-white transition-colors hover:bg-[#b36a4e] sm:h-9 sm:gap-2 sm:px-3 sm:text-sm md:h-10"
                >
                  <span>CRM</span>
                  <LuArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectionMenuOpen(false)
                    setBulkDeleteOpen(true)
                  }}
                  aria-label={`Delete ${selectedCount} selected clients`}
                  className="flex h-8 w-8 items-center justify-center rounded-xs bg-danger text-white transition-colors hover:bg-danger-strong sm:h-9 sm:w-9 md:h-10 md:w-10"
                >
                  <LuTrash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </>
            ) : (
              <>
                {activeTab === 'clients' && (
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    aria-label="Search clients"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e] sm:h-9 sm:w-9 md:h-10 md:w-10"
                  >
                    <LuSearch className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
                      className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e] sm:h-9 sm:w-9 md:h-10 md:w-10"
                    >
                      <LuPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
                      className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#cc785c] text-white transition-colors hover:bg-[#b36a4e] sm:h-9 sm:w-9 md:h-10 md:w-10"
                    >
                      <LuFilter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
              </>
            )}
          </div>
        </div>

        <div
          ref={resultsScrollRef}
          className="relative min-h-0 flex-1 overflow-y-auto"
          aria-busy={activeTab === 'clients' ? loading : importsLoading}
        >
          <div className={activeTab === 'clients' && loading ? 'blur-sm' : ''}>
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
                    isSelected={isClientSelected}
                    isSelectionLocked={(client) => Boolean(client.importId && selectedImportIds.has(client.importId))}
                    onToggleSelection={toggleClientSelection}
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
                    isSelected={isClientSelected}
                    isSelectionLocked={(client) => Boolean(client.importId && selectedImportIds.has(client.importId))}
                    onToggleSelection={toggleClientSelection}
                    canManage={canCreate}
                  />
                </section>
              ) : (
                <section id="clients-panel-imports" role="tabpanel" aria-labelledby="clients-tab-imports">
                  <ClientImportsPanel
                    imports={clientImports}
                    loading={importsLoading}
                    error={importsError}
                    canDelete={canCreate}
                    deletingImports={deletingImports}
                    onDelete={setImportToDelete}
                    onViewClients={(entry) => {
                      setSelectedImportId(entry.id)
                      setPage(1)
                      setActiveTab('clients')
                    }}
                  />
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
        <BulkClientDeleteDialog
          open={bulkDeleteOpen}
          token={token}
          clientIds={actionableSelectedClientIds}
          imports={selectedImportRecords}
          onClose={() => setBulkDeleteOpen(false)}
          onDeleted={() => {
            const count = selectedCount
            setBulkDeleteOpen(false)
            setSelectedClientIds(new Set())
            setSelectedImports({})
            setRefreshKey((current) => current + 1)
            setImportRefreshKey((current) => current + 1)
            setToast({ message: `${count} selected client${count === 1 ? '' : 's'} deleted`, type: 'success' })
          }}
        />
        {clientToPipelineOpen ? (
          <ClientToPipeline
            open
            token={token}
            clientIds={actionableSelectedClientIds}
            imports={selectedImportRecords}
            selectedCount={selectedCount}
            onClose={() => setClientToPipelineOpen(false)}
            onCompleted={({ added, skipped, missing, pipelineName }) => {
              setClientToPipelineOpen(false)
              setSelectedClientIds(new Set())
              setSelectedImports({})
              const details = [
                `${added} client${added === 1 ? '' : 's'} added to ${pipelineName}`,
                skipped ? `${skipped} already in the pipeline` : null,
                missing ? `${missing} no longer available` : null,
              ].filter(Boolean)
              setToast({ message: details.join('. '), type: 'success' })
            }}
          />
        ) : null}
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
