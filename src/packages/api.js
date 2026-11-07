import { API_BASE_URL, getApiErrorMessage } from '../authetication/api.js'

function jsonHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function readResponse(response, fallback) {
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(getApiErrorMessage(response, data, fallback))
  }
  return data
}

export async function fetchPackages(token, params = {}) {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.category && params.category !== 'all') query.set('category', params.category)
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))

  const response = await fetch(
    `${API_BASE_URL}/packages${query.toString() ? `?${query.toString()}` : ''}`,
    { headers: jsonHeaders(token) },
  )
  return readResponse(response, 'Unable to load packages.')
}

export async function fetchPackageCategories(token) {
  const response = await fetch(`${API_BASE_URL}/packages/categories`, {
    headers: jsonHeaders(token),
  })
  const data = await readResponse(response, 'Unable to load package categories.')
  return Array.isArray(data) ? data : []
}

export async function fetchPackage(token, id) {
  const response = await fetch(`${API_BASE_URL}/packages/${id}`, {
    headers: jsonHeaders(token),
  })
  return readResponse(response, 'Unable to load package details.')
}

export async function updatePackage(token, id, payload) {
  const response = await fetch(`${API_BASE_URL}/packages/${id}`, {
    method: 'PATCH',
    headers: jsonHeaders(token),
    body: JSON.stringify(payload),
  })
  return readResponse(response, 'Unable to update package.')
}

export async function deletePackage(token, id) {
  const response = await fetch(`${API_BASE_URL}/packages/${id}`, {
    method: 'DELETE',
    headers: jsonHeaders(token),
  })
  return readResponse(response, 'Unable to delete package.')
}

export async function uploadPackageImage(token, id, slot, file) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${API_BASE_URL}/packages/${id}/images/${slot}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  return readResponse(response, 'Unable to upload image.')
}

export async function deletePackageImage(token, id, slot) {
  const response = await fetch(`${API_BASE_URL}/packages/${id}/images/${slot}`, {
    method: 'DELETE',
    headers: jsonHeaders(token),
  })
  return readResponse(response, 'Unable to remove image.')
}

export async function createPackage(token, payload) {
  const response = await fetch(`${API_BASE_URL}/packages`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(payload),
  })
  return readResponse(response, 'Unable to create package.')
}
