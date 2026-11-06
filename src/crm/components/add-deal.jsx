import { useState } from 'react'
import { EMPTY_CLIENT_FORM, buildClientPayload } from '../../clients/client-form.js'
import ClientFormFields from '../../clients/components/client-form-fields.jsx'
import ClientFormModal from '../../clients/components/client-form-modal.jsx'
import { createCrmDeal } from '../api.js'
import { sortStages } from '../utils.js'
import PipelineTag from './pipeline-tag.jsx'

/**
 * Adds a new client to the Clients table and to the selected pipeline (first
 * stage) in one request. Uses the same fields and validation as Add client.
 */
export default function AddDeal({ open, ...props }) {
  // Mount fresh on every open so the form always starts empty.
  if (!open || !props.pipeline) return null
  return <AddDealDialog {...props} />
}

function AddDealDialog({ token, pipeline, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_CLIENT_FORM)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const firstStage = sortStages(pipeline.stages)[0]

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
      const deal = await createCrmDeal(token, pipeline.id, payload)
      onCreated?.(deal)
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Unable to add deal.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ClientFormModal
      titleId="add-deal-title"
      title="Add deal"
      subtitle={
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span>Creates the client and adds it to</span>
          <PipelineTag name={pipeline.name} />
          {firstStage ? <span>in “{firstStage.name}”.</span> : null}
        </span>
      }
      submitLabel="Add deal"
      busyLabel="Adding..."
      busy={busy}
      error={error}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <ClientFormFields form={form} onChange={setForm} disabled={busy} idPrefix="deal-client" />
    </ClientFormModal>
  )
}
