export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/rest/v1'

function extractMessage(data, fallback) {
  if (!data) return fallback
  const { message } = data
  if (Array.isArray(message)) return message[0] ?? fallback
  if (typeof message === 'string') return message
  return fallback
}

export async function loginRequest({ email, password }) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch {
    throw new Error('Cannot reach the server. Is the API running?')
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      extractMessage(data, 'Unable to sign in. Check your details and try again.'),
    )
  }

  return data
}

export async function checkHealth(timeoutMs = 5000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`Health check failed with status ${response.status}`)
    }
    return response.json()
  } finally {
    clearTimeout(timer)
  }
}
