import { API_BASE_URL, getApiErrorMessage } from '../authetication/api.js'

/*
 * Shared notifications client (/rest/v1/notifications). Any module's alerts land
 * here; the backend writes them (e.g. calendar on assignment), this only reads
 * and marks them read for the signed-in user.
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
    throw error
  }
  return data
}

/** { items, page, hasMore, unread } — newest first, 50 per page (set on the server). */
export function fetchNotifications(token, page = 1) {
  return request(token, `/notifications?page=${page}`, {}, 'Unable to load notifications.')
}

export async function fetchUnreadCount(token) {
  const data = await request(token, '/notifications/unread-count', {}, 'Unable to load notifications.')
  return Number(data?.unread ?? 0)
}

/** Mark the given ids read, or everything when `ids` is omitted. Returns the new unread count. */
export async function markNotificationsRead(token, ids) {
  const data = await request(
    token,
    '/notifications/read',
    { method: 'PATCH', body: ids?.length ? { ids } : {} },
    'Unable to update notifications.',
  )
  return Number(data?.unread ?? 0)
}
