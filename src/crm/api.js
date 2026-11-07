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

export async function renameCrmStage(token, pipelineId, stageId, name) {
  const response = await fetch(`${API_BASE_URL}/crm/pipelines/${pipelineId}/stages/${stageId}`, {
    method: 'PATCH',
    headers: authHeaders(token, true),
    body: JSON.stringify({ name }),
  })
  return readResponse(response, 'Unable to rename stage.')
}

export async function reorderCrmStages(token, pipelineId, stageIds) {
  const response = await fetch(`${API_BASE_URL}/crm/pipelines/${pipelineId}/stages/order`, {
    method: 'PUT',
    headers: authHeaders(token, true),
    body: JSON.stringify({ stageIds }),
  })
  return readResponse(response, 'Unable to save stage order.')
}

export async function renameCrmPipeline(token, pipelineId, name) {
  const response = await fetch(`${API_BASE_URL}/crm/pipelines/${pipelineId}`, {
    method: 'PATCH',
    headers: authHeaders(token, true),
    body: JSON.stringify({ name }),
  })
  return readResponse(response, 'Unable to rename pipeline.')
}

export async function fetchCrmPipelineDeleteImpact(token, pipelineId) {
  const response = await fetch(`${API_BASE_URL}/crm/pipelines/${pipelineId}/delete-impact`, {
    headers: authHeaders(token),
  })
  return readResponse(response, 'Unable to load what will be deleted.')
}

export async function deleteCrmPipeline(token, pipelineId) {
  const response = await fetch(`${API_BASE_URL}/crm/pipelines/${pipelineId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  return readResponse(response, 'Unable to delete pipeline.')
}

export async function fetchCrmDeals(token, pipelineId) {
  const response = await fetch(`${API_BASE_URL}/crm/pipelines/${pipelineId}/deals`, {
    headers: authHeaders(token),
  })
  return readResponse(response, 'Unable to load deals.')
}

/** Creates a new client and adds it to the pipeline's first stage as a deal. */
export async function createCrmDeal(token, pipelineId, client) {
  const response = await fetch(`${API_BASE_URL}/crm/pipelines/${pipelineId}/deals`, {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify({ client }),
  })
  return readResponse(response, 'Unable to add deal.')
}

export async function moveCrmDeal(token, dealId, stageId) {
  const response = await fetch(`${API_BASE_URL}/crm/deals/${dealId}`, {
    method: 'PATCH',
    headers: authHeaders(token, true),
    body: JSON.stringify({ stageId }),
  })
  return readResponse(response, 'Unable to move deal.')
}
