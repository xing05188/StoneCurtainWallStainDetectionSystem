import type { H3Event } from 'h3'
import { getCookie, getHeader } from 'h3'
import { Buffer } from 'buffer'
import { findByToken } from '../auth/_store'

export interface DetectParams {
  model: string
  conf: number
  iou: number
  imgsz: number
  max_det: number
}

export interface DetectionMetrics {
  count: number
  area_ratio: number
  avg_conf: number
}

export interface DetectionRecord {
  id: string
  userId: string
  username: string
  filename: string
  params: DetectParams
  metrics: DetectionMetrics
  image_base64: string
  created_at: string
}

export type JobStatus = 'queued' | 'running' | 'done' | 'error'

export interface JobRecord {
  id: string
  userId: string
  username: string
  status: JobStatus
  result?: DetectionRecord
  message?: string
}

export interface BatchRecord {
  batchNo: string
  userId: string
  username: string
  totalCount: number
  processedCount: number
  status: 'processing' | 'done' | 'partial_error'
  createdAt: string
  jobs: string[] // job IDs
}

const detectionStore = new Map<string, DetectionRecord[]>()
const jobStore = new Map<string, JobRecord>()
const batchStore = new Map<string, BatchRecord>()

export const readUserFromEvent = (event: H3Event) => {
  // 1. 首先尝试从 Authorization header 读取
  const authHeader = getHeader(event, 'authorization') || ''
  
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7)
    console.log('[readUserFromEvent] Checking token from Authorization header:', token.substring(0, 20) + '...')
    const user = findByToken(token)
    if (user) {
      console.log('[readUserFromEvent] ✅ User authenticated via Authorization header:', user.username)
      return user
    } else {
      console.log('[readUserFromEvent] ⚠️ Token found in header but user not found. Token might be invalid or expired.')
    }
  }
  
  // 2. 如果 header 中没有，尝试从 cookie 读取
  const cookieToken = getCookie(event, 'auth_token')
  if (cookieToken) {
    console.log('[readUserFromEvent] Checking token from cookie:', cookieToken.substring(0, 20) + '...')
    const user = findByToken(cookieToken)
    if (user) {
      console.log('[readUserFromEvent] ✅ User authenticated via cookie:', user.username)
      return user
    } else {
      console.log('[readUserFromEvent] ⚠️ Token found in cookie but user not found. Token might be invalid or expired.')
    }
  }
  
  console.log('[readUserFromEvent] ❌ No valid authentication found')
  console.log('[readUserFromEvent] - Authorization header:', authHeader ? `present (${authHeader.substring(0, 30)}...)` : 'missing')
  console.log('[readUserFromEvent] - Cookie token:', cookieToken ? `present (${cookieToken.substring(0, 20)}...)` : 'missing')
  return null
}

const toBase64 = (data: Buffer | Uint8Array) => {
  const buf = data instanceof Buffer ? data : Buffer.from(data)
  return buf.toString('base64')
}

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

export const createMockDetection = (userId: string, username: string, file: { data: Buffer | Uint8Array; filename?: string }, params: DetectParams): DetectionRecord => {
  const metrics: DetectionMetrics = {
    count: 1,
    area_ratio: 0.12,
    avg_conf: Number((params.conf || 0.5).toFixed(3))
  }
  const record: DetectionRecord = {
    id: makeId(),
    userId,
    username,
    filename: file.filename || 'upload.png',
    params,
    metrics,
    image_base64: toBase64(file.data),
    created_at: new Date().toISOString()
  }
  const list = detectionStore.get(userId) || []
  list.unshift(record)
  detectionStore.set(userId, list.slice(0, 200))
  return record
}

export const createMockJob = (userId: string, username: string, file: { data: Buffer | Uint8Array; filename?: string }, params: DetectParams): JobRecord => {
  const jobId = `job_${makeId()}`
  const job: JobRecord = {
    id: jobId,
    userId,
    username,
    status: 'queued',
    message: 'Queued'
  }
  jobStore.set(jobId, job)

  // 模拟异步处理
  setTimeout(() => {
    job.status = 'running'
    setTimeout(() => {
      const result = createMockDetection(userId, username, file, params)
      job.result = result
      job.status = 'done'
      job.message = 'Done'
    }, 2000)
  }, 1000)

  return job
}

export const createMockBatch = (userId: string, username: string, files: Array<{ data: Buffer | Uint8Array; filename?: string }>, params: DetectParams) => {
  const batchNo = `batch_${makeId()}`
  const jobIds: string[] = []

  // Create jobs for each file
  files.forEach(file => {
    const job = createMockJob(userId, username, file, params)
    jobIds.push(job.id)
  })

  const batch: BatchRecord = {
    batchNo,
    userId,
    username,
    totalCount: files.length,
    processedCount: 0,
    status: 'processing',
    createdAt: new Date().toISOString(),
    jobs: jobIds
  }

  batchStore.set(batchNo, batch)

  // Simulate batch processing updates
  let completed = 0
  const interval = setInterval(() => {
    completed++
    const currentBatch = batchStore.get(batchNo)
    if (currentBatch) {
      currentBatch.processedCount = completed
      if (completed >= files.length) {
        currentBatch.status = 'done'
        clearInterval(interval)
      }
    }
  }, 1500)

  return batch
}

export const getJobById = (id: string, userId: string) => {
  const job = jobStore.get(id)
  if (job && job.userId === userId) return job
  return null
}
