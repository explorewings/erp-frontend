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
