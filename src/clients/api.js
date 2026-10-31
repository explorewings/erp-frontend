import { API_BASE_URL } from '../authetication/api.js'

async function readResponse(response, fallback) {
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = (Array.isArray(data?.message) ? data.message[0] : data?.message) || fallback
    throw new Error(message)
  }
  return data
}

export async function fetchClients(token, params = {}) {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  const response = await fetch(
    `${API_BASE_URL}/clients${query.size ? `?${query.toString()}` : ''}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return readResponse(response, 'Unable to load clients.')
}

export async function createClient(token, payload) {
  const response = await fetch(`${API_BASE_URL}/clients`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  return readResponse(response, 'Unable to create client.')
}
