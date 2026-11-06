import { LuPlus, LuTrash2 } from 'react-icons/lu'
import { MAX_CUSTOM_FIELDS } from '../client-form.js'

/**
 * Shared client form: fields, layout, and validation used by Add client
 * (Clients page) and Add deal (CRM). Change a field or rule here and both
 * modals follow. Validation and the empty form live in ../client-form.js.
 */

const fieldClass =
  'mt-1.5 h-11 w-full rounded-xs border px-3.5 text-body-sm text-[var(--ew-ink)] outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60'
const customFieldClass =
  'h-10 min-w-0 rounded-xs border px-3 text-body-sm text-[var(--ew-ink)] outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60'
const fieldStyle = { borderColor: 'var(--ew-field-line)', background: 'var(--ew-surface)' }
const labelClass = 'block text-label font-medium uppercase tracking-[0.08em] text-[var(--ew-muted)]'

/**
 * Renders the client fields. `onChange` receives an updater function
 * (`(form) => nextForm`), so it can be a state setter directly.
 * `idPrefix` keeps input ids unique if two forms are ever on screen.
 */
export default function ClientFormFields({ form, onChange, disabled = false, idPrefix = 'client' }) {
  const setField = (name) => (event) => {
    const value = event.target.value
    onChange((current) => ({ ...current, [name]: value }))
  }

  const updateCustomField = (index, changes) =>
    onChange((current) => ({
      ...current,
      customFields: current.customFields.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    }))

  return (
    <>
      <label htmlFor={`${idPrefix}-name`} className={labelClass}>
        Name <span className="text-[var(--ew-accent-strong)]">*</span>
        <input
          id={`${idPrefix}-name`}
          required
          maxLength={200}
          autoFocus
          className={`${fieldClass} normal-case tracking-normal`}
          style={fieldStyle}
          value={form.name}
          disabled={disabled}
          onChange={setField('name')}
        />
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label htmlFor={`${idPrefix}-phone`} className={labelClass}>
          Phone {form.email.trim() && <span className="font-normal tracking-normal">(optional)</span>}
          <input
            id={`${idPrefix}-phone`}
            type="tel"
            maxLength={40}
            className={`${fieldClass} normal-case tracking-normal`}
            style={fieldStyle}
            value={form.phoneNumber}
            disabled={disabled}
            onChange={setField('phoneNumber')}
          />
        </label>
        <label htmlFor={`${idPrefix}-email`} className={labelClass}>
          Email {form.phoneNumber.trim() && <span className="font-normal tracking-normal">(optional)</span>}
          <input
            id={`${idPrefix}-email`}
            type="email"
            maxLength={320}
            className={`${fieldClass} normal-case tracking-normal`}
            style={fieldStyle}
            value={form.email}
            disabled={disabled}
            onChange={setField('email')}
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-label font-medium text-[var(--ew-ink)]">Additional fields</h3>
            <p className="mt-0.5 text-xs text-[var(--ew-muted)]">Add details such as age, city, or remarks.</p>
          </div>
          <button
            type="button"
            onClick={() =>
              onChange((current) => ({
                ...current,
                customFields: [...current.customFields, { key: '', value: '' }],
              }))
            }
            disabled={disabled || form.customFields.length >= MAX_CUSTOM_FIELDS}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xs border px-3 py-2 text-xs font-medium text-[var(--ew-ink)] hover:bg-ground/70 disabled:opacity-50"
            style={{ borderColor: 'var(--ew-line)' }}
          >
            <LuPlus className="h-3.5 w-3.5" />
            Add field
          </button>
        </div>
        {form.customFields.map((field, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
            <input
              aria-label={`Additional field ${index + 1} name`}
              placeholder="Field name"
              maxLength={100}
              className={customFieldClass}
              style={fieldStyle}
              value={field.key}
              disabled={disabled}
              onChange={(event) => updateCustomField(index, { key: event.target.value })}
            />
            <input
              aria-label={`Additional field ${index + 1} value`}
              placeholder="Value"
              maxLength={1000}
              className={customFieldClass}
              style={fieldStyle}
              value={field.value}
              disabled={disabled}
              onChange={(event) => updateCustomField(index, { value: event.target.value })}
            />
            <button
              type="button"
              aria-label={`Remove additional field ${index + 1}`}
              disabled={disabled}
              onClick={() =>
                onChange((current) => ({
                  ...current,
                  customFields: current.customFields.filter((_, itemIndex) => itemIndex !== index),
                }))
              }
              className="flex h-9 w-9 items-center justify-center rounded-xs text-[var(--ew-muted)] hover:bg-ground hover:text-[var(--ew-accent-strong)] disabled:opacity-50"
            >
              <LuTrash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
