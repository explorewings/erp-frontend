import { API_BASE_URL } from '../authetication/api.js'

export async function updateUser(token, id, payload) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/settings/users/${id}`, {
      method: 'PATCH',
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
      'Unable to update user.'
    throw new Error(message)
  }
  return data
}

export async function deleteUser(token, id) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/settings/users/${id}`, {
      method: 'DELETE',
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
      'Unable to delete user.'
    throw new Error(message)
  }
  return data
}

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

export async function fetchMyAccess(token) {
  const response = await fetch(`${API_BASE_URL}/settings/access/me`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  }).catch(() => null)
  if (!response || !response.ok) return { codes: null }
  return response.json().catch(() => ({ codes: null }))
}

export async function fetchAccess(token, userId) {
  const response = await fetch(`${API_BASE_URL}/settings/access/${userId}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error((Array.isArray(data?.message) ? data.message[0] : data?.message) || 'Unable to load access.')
  }
  return Array.isArray(data) ? data : []
}

export async function saveAccess(token, userId, codes) {
  const response = await fetch(`${API_BASE_URL}/settings/access/${userId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ codes }),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error((Array.isArray(data?.message) ? data.message[0] : data?.message) || 'Unable to save access.')
  }
  return data
}

export async function fetchMenuAccess(token, code) {
  const response = await fetch(`${API_BASE_URL}/settings/access/menu/${encodeURIComponent(code)}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error((Array.isArray(data?.message) ? data.message[0] : data?.message) || 'Unable to load access.')
  }
  return Array.isArray(data) ? data : []
}

export async function saveMenuAccess(token, code, userIds) {
  const response = await fetch(`${API_BASE_URL}/settings/access/menu/${encodeURIComponent(code)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userIds }),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error((Array.isArray(data?.message) ? data.message[0] : data?.message) || 'Unable to save access.')
  }
  return data
}

export async function fetchAccessItems(token, type) {
  const query = type ? `?type=${encodeURIComponent(type)}` : ''
  const response = await fetch(`${API_BASE_URL}/settings/access/items${query}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error((Array.isArray(data?.message) ? data.message[0] : data?.message) || 'Unable to load access items.')
  }
  return Array.isArray(data) ? data : []
}
