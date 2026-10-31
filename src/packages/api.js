const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/rest/v1'

export async function fetchPackages(token, params = {}) {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.category && params.category !== 'all') query.set('category', params.category)
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  const response = await fetch(`${API_BASE_URL}/packages${query.toString() ? `?${query.toString()}` : ''}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = (Array.isArray(data?.message) ? data.message[0] : data?.message) ?? 'Unable to load packages.'
    throw new Error(message)
  }
  return data
}

export async function fetchPackageCategories(token) {
  const response = await fetch(`${API_BASE_URL}/packages/categories`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = (Array.isArray(data?.message) ? data.message[0] : data?.message) ?? 'Unable to load package categories.'
    throw new Error(message)
  }
  return Array.isArray(data) ? data : []
}

export async function fetchPackage(token, id) {
  const response = await fetch(`${API_BASE_URL}/packages/${id}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = (Array.isArray(data?.message) ? data.message[0] : data?.message) ?? 'Unable to load package details.'
    throw new Error(message)
  }
  return data
}

export async function updatePackage(token, id, payload) {
  const response = await fetch(`${API_BASE_URL}/packages/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = (Array.isArray(data?.message) ? data.message[0] : data?.message) || 'Unable to update package.'
    throw new Error(message)
  }
  return data
}

export async function uploadPackageImage(token, id, slot, file) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${API_BASE_URL}/packages/${id}/images/${slot}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = (Array.isArray(data?.message) ? data.message[0] : data?.message) || 'Unable to upload image.'
    throw new Error(message)
  }
  return data
}

export async function deletePackageImage(token, id, slot) {
  const response = await fetch(`${API_BASE_URL}/packages/${id}/images/${slot}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = (Array.isArray(data?.message) ? data.message[0] : data?.message) || 'Unable to remove image.'
    throw new Error(message)
  }
  return data
}


export async function createPackage(token, payload) {
  const response = await fetch(`${API_BASE_URL}/packages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = (Array.isArray(data?.message) ? data.message[0] : data?.message) || 'Unable to create package.'
    throw new Error(message)
  }
  return data
}
