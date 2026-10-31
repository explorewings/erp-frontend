const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/rest/v1'

function jsonHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function getErrorMessage(data, fallback) {
  return (Array.isArray(data?.message) ? data.message[0] : data?.message) || fallback
}

async function readResponse(response, fallback) {
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(getErrorMessage(data, fallback))
  return data
}

export async function fetchResorts(token, params = {}) {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  const response = await fetch(
    `${API_BASE_URL}/resorts${query.size ? `?${query.toString()}` : ''}`,
    { headers: jsonHeaders(token) },
  )
  return readResponse(response, 'Unable to load resorts.')
}

export async function fetchResort(token, id) {
  const response = await fetch(`${API_BASE_URL}/resorts/${id}`, {
    headers: jsonHeaders(token),
  })
  return readResponse(response, 'Unable to load resort details.')
}

export async function createResort(token, payload) {
  const response = await fetch(`${API_BASE_URL}/resorts`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(payload),
  })
  return readResponse(response, 'Unable to create resort.')
}

export async function updateResort(token, id, payload) {
  const response = await fetch(`${API_BASE_URL}/resorts/${id}`, {
    method: 'PATCH',
    headers: jsonHeaders(token),
    body: JSON.stringify(payload),
  })
  return readResponse(response, 'Unable to update resort.')
}

export async function deleteResort(token, id) {
  const response = await fetch(`${API_BASE_URL}/resorts/${id}`, {
    method: 'DELETE',
    headers: jsonHeaders(token),
  })
  return readResponse(response, 'Unable to delete resort.')
}

export async function uploadResortImage(token, id, slot, file) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${API_BASE_URL}/resorts/${id}/images/${slot}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  return readResponse(response, 'Unable to upload resort image.')
}

export async function deleteResortImage(token, id, slot) {
  const response = await fetch(`${API_BASE_URL}/resorts/${id}/images/${slot}`, {
    method: 'DELETE',
    headers: jsonHeaders(token),
  })
  return readResponse(response, 'Unable to remove resort image.')
}
