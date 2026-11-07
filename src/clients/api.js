import { API_BASE_URL, getApiErrorMessage } from '../authetication/api.js'

async function readResponse(response, fallback) {
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(getApiErrorMessage(response, data, fallback))
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
  if (params.importId) query.set('importId', String(params.importId))
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

export async function deleteClientsBatch(token, ids) {
  const response = await fetch(`${API_BASE_URL}/clients/bulk`, {
    method: 'DELETE',
    headers: authHeaders(token, true),
    body: JSON.stringify({ ids }),
  })
  return readResponse(response, 'Unable to delete selected clients.')
}

export async function deleteImportedClientsBatch(token, importId) {
  const response = await fetch(`${API_BASE_URL}/clients/imports/${importId}/bulk`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  return readResponse(response, 'Unable to delete imported clients.')
}

export async function createClientImport(token, payload) {
  const response = await fetch(`${API_BASE_URL}/client-imports`, {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify(payload),
  })
  return readResponse(response, 'Unable to start client import.')
}

export async function fetchClientImports(token) {
  const response = await fetch(`${API_BASE_URL}/client-imports`, {
    headers: authHeaders(token),
    cache: 'no-store',
  })
  const imports = await readResponse(response, 'Unable to load client imports.')
  if (!Array.isArray(imports)) return imports

  return Promise.all(imports.map(async (clientImport) => {
    const clients = await fetchClients(token, {
      page: 1,
      limit: 1,
      importId: clientImport.id,
    })
    const clientCount = Number(clients?.total)
    if (!Number.isInteger(clientCount) || clientCount < 0) {
      throw new Error(`The server returned an invalid client count for "${clientImport.name}".`)
    }
    return { ...clientImport, clientCount }
  }))
}

export async function deleteClientImport(token, importId) {
  const response = await fetch(`${API_BASE_URL}/client-imports/${importId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  return readResponse(response, 'Unable to delete client import.')
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
