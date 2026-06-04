import axios from 'axios'

const BASE = '/detection-api/api'

function getAuthHeaders() {
  const token = localStorage.getItem('authToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function unwrapApiResponse<T>(resp: { data: any }): T {
  const body = resp.data
  if (body && typeof body === 'object' && 'code' in body && body.code !== 0) {
    throw new Error(body.message || '请求失败')
  }
  return (body?.data ?? body) as T
}

export async function createDetectionTask(file: File, payload: any, onUploadProgress?: (p: number) => void) {
  const url = `${BASE}/detections`
  const data = new FormData()
  data.append('image', file)
  data.append('building_name', payload.buildingName)
  if (payload.locationFloor !== undefined) data.append('location_floor', String(payload.locationFloor))
  if (payload.locationSection) data.append('location_section', payload.locationSection)
  if (payload.description) data.append('description', payload.description)
  data.append('inference_mode', payload.inferenceMode || 'local')

  const resp = await axios.post(url, data, {
    headers: {
      ...getAuthHeaders()
    },
    timeout: 300000,
    onUploadProgress: (e: ProgressEvent) => {
      if (!e.total || !onUploadProgress) return
      onUploadProgress(Math.round((e.loaded / e.total) * 100))
    }
  })
  return unwrapApiResponse(resp)
}

export async function getDetectionTask(taskId: string | number) {
  const url = `${BASE}/detections/${taskId}`
  const resp = await axios.get(url, { headers: getAuthHeaders() })
  return unwrapApiResponse(resp)
}

export async function getDetectionList(params: any) {
  const url = `${BASE}/detections`
  const queryParams: any = {}
  if (params.currentPage) queryParams.current_page = params.currentPage
  if (params.size) queryParams.size = params.size
  if (params.status) queryParams.status = params.status
  if (params.buildingName) queryParams.building_name = params.buildingName
  if (params.startTime) queryParams.start_time = params.startTime
  if (params.endTime) queryParams.end_time = params.endTime
  const resp = await axios.get(url, { headers: getAuthHeaders(), params: queryParams })
  const apiResp = unwrapApiResponse<{ items: any[], pagination: { total?: number } }>(resp)
  return {
    list: apiResp.items ?? [],
    total: apiResp.pagination?.total ?? 0
  }
}

export async function getDetectionSignedUrl(taskId: string | number) {
  const url = `${BASE}/detections/${taskId}/signed-url`
  const resp = await axios.get(url, { headers: getAuthHeaders() })
  return unwrapApiResponse(resp)
}

export async function retryDetection(taskId: string | number) {
  const url = `${BASE}/detections/${taskId}/retry`
  const resp = await axios.post(url, {}, { headers: getAuthHeaders() })
  return unwrapApiResponse(resp)
}

export async function deleteDetection(taskId: string | number) {
  const url = `${BASE}/detections/${taskId}`
  const resp = await axios.delete(url, { headers: getAuthHeaders() })
  return unwrapApiResponse(resp)
}

export async function batchDeleteDetections(taskIds: (string | number)[]) {
  const url = `${BASE}/detections/batch/delete`
  const resp = await axios.delete(url, {
    headers: getAuthHeaders(),
    params: { task_ids: taskIds.join(',') }
  })
  return unwrapApiResponse(resp)
}