import { API_BASE_URL } from '../authetication/api.js'

export async function fetchUsers(token) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/settings/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
  } catch {
    throw new Error('Cannot reach the server. Is the API running?')
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      (Array.isArray(data?.message) ? data.message[0] : data?.message) ??
      'Unable to load users.'
    throw new Error(message)
  }
  return Array.isArray(data) ? data : (data?.users ?? [])
}

export async function createUser(token, payload) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/settings/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('Cannot reach the server. Is the API running?')
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      (Array.isArray(data?.message) ? data.message[0] : data?.message) ??
      'Unable to create user.'
    throw new Error(message)
  }
  return data
}
