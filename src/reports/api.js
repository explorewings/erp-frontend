import { API_BASE_URL, getApiErrorMessage } from '../authetication/api.js'

async function readResponse(response, fallback) {
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(getApiErrorMessage(response, data, fallback))
  return data
}

function headers(token) {
  return { Authorization: `Bearer ${token}` }
}

export async function fetchReports(token, page = 1, date = null, userId = null) {
  const query = new URLSearchParams({ page: String(page), limit: '100' })
  if (date) query.set('date', date)
  if (userId) query.set('userId', userId)
  const response = await fetch(`${API_BASE_URL}/reports?${query}`, { headers: headers(token) })
  return readResponse(response, 'Unable to load reports.')
}

export async function createReport(token, formData) {
  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: 'POST',
    headers: headers(token),
    body: formData,
  })
  return readResponse(response, 'Unable to submit report.')
}

export async function updateReport(token, id, formData) {
  const response = await fetch(`${API_BASE_URL}/reports/${id}`, {
    method: 'PATCH',
    headers: headers(token),
    body: formData,
  })
  return readResponse(response, 'Unable to update report.')
}

export async function updateReportRemarks(token, id, remarks) {  const response = await fetch(`${API_BASE_URL}/reports/${id}/remarks`, {
    method: 'PATCH',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ remarks }),
  })
  return readResponse(response, 'Unable to save remarks.')
}

export async function deleteReport(token, id) {
  const response = await fetch(`${API_BASE_URL}/reports/${id}`, {
    method: 'DELETE',
    headers: headers(token),
  })
  return readResponse(response, 'Unable to delete report.')
}
