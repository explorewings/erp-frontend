import { API_BASE_URL } from '../authetication/api.js'

async function readResponse(response, fallback) {
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = (Array.isArray(data?.message) ? data.message[0] : data?.message) || fallback
    throw new Error(message)
  }
  return data
}

function authHeaders(token, includeJson = false) {
  return {
    Authorization: `Bearer ${token}`,
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
  }
}

export async function fetchClients(token, params = {}) {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  const response = await fetch(
    `${API_BASE_URL}/clients${query.size ? `?${query.toString()}` : ''}`,
    { headers: authHeaders(token) },
  )
  return readResponse(response, 'Unable to load clients.')
}

export async function createClient(token, payload) {
  const response = await fetch(`${API_BASE_URL}/clients`, {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify(payload),
  })
  return readResponse(response, 'Unable to create client.')
}

export async function updateClient(token, id, payload) {
  const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token, true),
    body: JSON.stringify(payload),
  })
  return readResponse(response, 'Unable to update client.')
}

export async function deleteClient(token, id) {
  const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  return readResponse(response, 'Unable to delete client.')
}

export async function createClientImport(token, payload) {
  const response = await fetch(`${API_BASE_URL}/client-imports`, {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify(payload),
  })
  return readResponse(response, 'Unable to start client import.')
}

export async function appendClientImportBatch(token, importId, rows) {
  const response = await fetch(`${API_BASE_URL}/client-imports/${importId}/batches`, {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify({ rows }),
  })
  return readResponse(response, 'Unable to import this client batch.')
}

export async function completeClientImport(token, importId) {
  const response = await fetch(`${API_BASE_URL}/client-imports/${importId}/complete`, {
    method: 'POST',
    headers: authHeaders(token, true),
  })
  return readResponse(response, 'Unable to complete client import.')
}

export async function failClientImport(token, importId) {
  const response = await fetch(`${API_BASE_URL}/client-imports/${importId}/fail`, {
    method: 'POST',
    headers: authHeaders(token, true),
  })
  return readResponse(response, 'Unable to record the failed client import.')
}
