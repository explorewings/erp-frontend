/** Client form state and validation shared by Add client and Add deal. */

export const EMPTY_CLIENT_FORM = { name: '', email: '', phoneNumber: '', customFields: [] }

export const MAX_CUSTOM_FIELDS = 50

/**
 * Validates the form and builds the API payload.
 * Returns `{ payload }` on success or `{ error }` with a message to show.
 */
export function buildClientPayload(form) {
  const email = form.email.trim()
  const phoneNumber = form.phoneNumber.trim()
  if (!email && !phoneNumber) {
    return { error: 'Enter an email address or phone number.' }
  }

  const customFields = {}
  for (const field of form.customFields) {
    const key = field.key.trim()
    const value = field.value.trim()
    if (!key && !value) continue
    if (!key || !value) {
      return { error: 'Enter both a name and value for each additional field.' }
    }
    if (Object.keys(customFields).some((existing) => existing.toLowerCase() === key.toLowerCase())) {
      return { error: `The additional field "${key}" is duplicated.` }
    }
    customFields[key] = value
  }

  return {
    payload: {
      name: form.name.trim(),
      email: email || null,
      phoneNumber: phoneNumber || null,
      customFields,
    },
  }
}
