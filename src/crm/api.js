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

export async function fetchCrmPipelines(token) {
  const response = await fetch(`${API_BASE_URL}/crm/pipelines`, { headers: authHeaders(token) })
  return readResponse(response, 'Unable to load pipelines.')
}

export async function createCrmPipeline(token, payload) {
  const response = await fetch(`${API_BASE_URL}/crm/pipelines`, {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify(payload),
  })
  return readResponse(response, 'Unable to create pipeline.')
}

export async function fetchCrmUsers(token) {
  const response = await fetch(`${API_BASE_URL}/settings/users`, { headers: authHeaders(token) })
  return readResponse(response, 'Unable to load users.')
}
