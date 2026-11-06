import { useState } from 'react'
import { createClient } from '../api.js'
import { EMPTY_CLIENT_FORM, buildClientPayload } from '../client-form.js'
import ClientFormFields from './client-form-fields.jsx'
import ClientFormModal from './client-form-modal.jsx'

export default function AddClient({ open, ...props }) {
  // Mount fresh on every open so the form always starts empty.
  if (!open) return null
  return <AddClientDialog {...props} />
}

function AddClientDialog({ token, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_CLIENT_FORM)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const { payload, error: validationError } = buildClientPayload(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setBusy(true)
    setError(null)
    try {
      const created = await createClient(token, payload)
      onCreated?.(created)
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Unable to create client.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ClientFormModal
      titleId="add-client-title"
      title="Add client"
      subtitle="Enter a name and at least one contact method."
      submitLabel="Add client"
      busyLabel="Adding..."
      busy={busy}
      error={error}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <ClientFormFields form={form} onChange={setForm} disabled={busy} idPrefix="client" />
    </ClientFormModal>
  )
}
