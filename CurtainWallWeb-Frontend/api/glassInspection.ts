import type { DetectionResultData, FlatnessFieldName } from '~/types/glassInspection'
import axios from 'axios'
import { absolutizeDetectionResultMedia } from '~/utils/glassInspection'
import { FLATNESS_FIELD_NAMES, type DetectionResultData, type FlatnessFieldName } from '~/types/glassInspection'

const LOCAL_GLASS_BACKEND_BASE = 'http://127.0.0.1:8080'
const REMOTE_GLASS_DETECTION_BASE = 'http://47.102.208.89:8007'
const REQUEST_TIMEOUT = 600000

function createMultipartHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'multipart/form-data'
  }

  if (process.client) {
    const token = localStorage.getItem('authToken')
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  return headers
}

function shouldFallbackToRemote(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return true
  }

  if (!error.response) {
    return true
  }

  return [404, 502, 503, 504].includes(error.response.status)
}

async function postDetection(baseURL: string, path: string, formData: FormData) {
  const response = await axios.post<DetectionResultData>(`${baseURL}${path}`, formData, {
    headers: createMultipartHeaders(),
    timeout: REQUEST_TIMEOUT,
    withCredentials: false
  })

  return response.data
}

async function postGlassInspection(path: string, formData: FormData) {
  try {
    const localResult = await postDetection(LOCAL_GLASS_BACKEND_BASE, path, formData)
    return absolutizeDetectionResultMedia(localResult, LOCAL_GLASS_BACKEND_BASE) as DetectionResultData
  } catch (localError) {
    if (!shouldFallbackToRemote(localError)) {
      throw localError
    }

    const remoteResult = await postDetection(REMOTE_GLASS_DETECTION_BASE, path, formData)
    return absolutizeDetectionResultMedia(remoteResult, REMOTE_GLASS_DETECTION_BASE) as DetectionResultData
  }
}

const API_BASE = import.meta.dev ? 'http://8.153.161.229:8003' : ''

export async function detectGlassCrack(email: string, files: File[]): Promise<DetectionResultData> {
  const formData = new FormData()
  formData.append('email', email)
  files.forEach((file) => formData.append('images', file))

  return await $fetch(`${API_BASE}/api/detect/glass-crack`, {
    method: 'POST',
    body: formData,
  }) as DetectionResultData
  return await postGlassInspection('/api/detect/glass-crack', formData)
}

export async function detectGlassFlatness(
  email: string,
  filesByField: Partial<Record<FlatnessFieldName, File>>
): Promise<DetectionResultData> {
  const formData = new FormData()
  formData.append('email', email)

  FLATNESS_FIELD_NAMES.forEach((field) => {
    const file = filesByField[field]
    if (file) {
      formData.append(field, file)
    }
  })

  return await $fetch(`${API_BASE}/api/detect/glass-flatness`, {
    method: 'POST',
    body: formData,
  }) as DetectionResultData
  return await postGlassInspection('/api/detect/glass-flatness', formData)
}
