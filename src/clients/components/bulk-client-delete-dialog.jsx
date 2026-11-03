import { useEffect, useMemo, useState } from 'react'
import Alert from '../../appcomponents/alert.jsx'
import { deleteClientsBatch, deleteImportedClientsBatch } from '../api.js'

const BATCH_SIZE = 100

export default function BulkClientDeleteDialog({
  open,
  token,
  clientIds = [],
  imports = [],
  onClose,
  onDeleted,
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [deletedCount, setDeletedCount] = useState(0)
  const [error, setError] = useState('')

  const totalCount = useMemo(
    () => clientIds.length + imports.reduce(
      (sum, item) => sum + (Number(item.clientCount ?? item.importedRows) || 0),
      0,
    ),
    [clientIds, imports],
  )
  const progress = totalCount > 0 ? Math.min(100, Math.round((deletedCount / totalCount) * 100)) : 0

  useEffect(() => {
    if (!open) {
      setIsDeleting(false)
      setDeletedCount(0)
      setError('')
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isDeleting) onClose?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, isDeleting, onClose])

  if (!open) return null

  const startDeleting = async () => {
    if (isDeleting || !token) return
    setIsDeleting(true)
    setError('')
    setDeletedCount(0)

    try {
      for (let offset = 0; offset < clientIds.length; offset += BATCH_SIZE) {
        const batch = clientIds.slice(offset, offset + BATCH_SIZE)
        const result = await deleteClientsBatch(token, batch)
        const count = Number(result?.deletedCount)
        if (!Number.isInteger(count) || count < 0 || count > batch.length) {
          throw new Error('The server returned invalid deletion progress.')
        }
        setDeletedCount((current) => current + count)
      }

      for (const clientImport of imports) {
        let remainingCount = null
        do {
          const result = await deleteImportedClientsBatch(token, clientImport.id)
          const deletedInBatch = Number(result?.deletedCount)
          remainingCount = Number(result?.remainingCount)
          if (
            !Number.isInteger(deletedInBatch) ||
            deletedInBatch < 0 ||
            deletedInBatch > BATCH_SIZE ||
            !Number.isInteger(remainingCount) ||
            remainingCount < 0
          ) {
            throw new Error('The server returned invalid deletion progress.')
          }
          if (deletedInBatch === 0 && remainingCount > 0) {
            throw new Error('Client deletion did not make progress. Please try again.')
          }
          setDeletedCount((current) => current + deletedInBatch)
        } while (remainingCount > 0)
      }

      onDeleted?.()
    } catch (deleteError) {
      setError(deleteError?.message || 'Unable to delete selected clients.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Alert
      open={open}
      title={isDeleting ? 'Deleting clients' : 'Delete selected clients?'}
      description={isDeleting
        ? undefined
        : `This permanently deletes ${totalCount} selected client${totalCount === 1 ? '' : 's'}. This cannot be undone.`}
      confirmLabel={error ? 'Retry delete' : 'Delete'}
      cancelLabel="Cancel"
      isConfirming={isDeleting}
      confirmDisabled={totalCount === 0}
      progress={isDeleting
        ? {
            value: progress,
            label: `${deletedCount} of ${totalCount} clients deleted`,
            ariaLabel: 'Client deletion progress',
          }
        : undefined}
      feedback={error}
      onConfirm={() => void startDeleting()}
      onCancel={() => {
        if (!isDeleting) onClose?.()
      }}
    />
  )
}
