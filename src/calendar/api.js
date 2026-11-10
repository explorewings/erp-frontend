import { API_BASE_URL, getApiErrorMessage } from '../authetication/api.js'

/*
 * Calendar API client for the v2 backend (docs/calendar-module.md §6).
 * The server sends `permissions` with every event; the UI renders actions from
 * those alone and never re-implements the transition rules.
 * Errors carry `status`, `code` (VALIDATION, INVALID_TRANSITION, VERSION_CONFLICT…)
 * and, on a 409, `current` — the latest version of the event.
 */

async function request(token, path, { method = 'GET', body } = {}, fallback) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.')
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(getApiErrorMessage(response, data, fallback))
    error.status = response.status
    error.code = data?.code ?? null
    error.current = data?.current ? normalizeEvent(data.current) : null
    throw error
  }
  return data
}

export function normalizeEvent(row) {
  return {
    ...row,
    description: row.description ?? '',
    location: row.location ?? '',
    members: row.members ?? [],
    permissions: row.permissions ?? { actions: [], canEdit: false, canDelete: false, editableFields: [] },
  }
}

/** Without `page` the server returns the whole range (month grid); with it, one page plus `hasMore` (day panel). */
export async function fetchCalendarEvents(token, { from, to, page, pageSize }) {
  const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })
  if (page) params.set('page', String(page))
  if (pageSize) params.set('pageSize', String(pageSize))
  const data = await request(token, `/calendar?${params}`, {}, 'Unable to load the calendar.')
  return {
    events: (data?.events ?? []).map(normalizeEvent),
    truncated: Boolean(data?.truncated),
    hasMore: Boolean(data?.hasMore),
  }
}

export async function fetchCalendarEvent(token, id) {
  const row = await request(token, `/calendar/${id}`, {}, 'Unable to load the event.')
  return normalizeEvent(row)
}

export async function createCalendarEvent(token, payload) {
  const row = await request(token, '/calendar', { method: 'POST', body: payload }, 'Unable to create the event.')
  return normalizeEvent(row)
}

/** Edit (plain fields) or workflow step ({ action, ...fields }); always pass the version you read. */
export async function updateCalendarEvent(token, id, body) {
  const row = await request(token, `/calendar/${id}`, { method: 'PATCH', body }, 'Unable to save the change.')
  return normalizeEvent(row)
}

export async function deleteCalendarEvent(token, id) {
  return request(token, `/calendar/${id}`, { method: 'DELETE' }, 'Unable to delete the event.')
}

export async function fetchCalendarUpdates(token, page = 1) {
  return request(token, `/calendar/updates?page=${page}`, {}, 'Unable to load updates.')
}

/** Audit trail of one event; 404 when the event is not visible to the viewer. */
export async function fetchCalendarHistory(token, id, page = 1) {
  return request(token, `/calendar/${id}/history?page=${page}`, {}, 'Unable to load the history.')
}

export async function fetchCalendarUsers(token) {
  // Server-side scoped: only active users who can open the calendar, so
  // assignee and member pickers never offer someone without access.
  const rows = await request(token, '/calendar/people', {}, 'Unable to load people.')
  return (rows ?? []).map((row) => ({
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
  }))
}
