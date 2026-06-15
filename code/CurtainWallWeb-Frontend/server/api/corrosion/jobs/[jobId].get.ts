/**
 * 接口名称: 查询锈蚀检测队列任务
 * 路径: GET /api/corrosion/jobs/:jobId -> GET {apiBase}/jobs/:jobId
 * 输入: jobId 路径参数
 * 输出: { status: 'queued' | 'running' | 'done' | 'error', result?: object }
 * 说明: 按用户鉴权，任务归属与账户关联；未配置 apiBase 时读取本地 mock。
 */
import { defineEventHandler, createError, getCookie } from 'h3'
import { readUserFromEvent, getJobById } from '../_store'

const readToken = (event: any) => {
  // 优先从 Authorization header 读取
  const auth = event.node.req.headers['authorization'] || ''
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7)
  }
  // 然后从 cookie 读取
  const cookieToken = getCookie(event, 'auth_token')
  return cookieToken || ''
}

export default defineEventHandler(async (event) => {
  const jobId = event.context.params?.jobId
  if (!jobId) {
    throw createError({ statusCode: 400, statusMessage: '缺少jobId' })
  }

  const config = useRuntimeConfig()
  const apiBase = config.public.corrosionApiBase || 'http://8.153.161.229:18000'
  console.log(`[jobs.get] Querying job: ${jobId}, apiBase: ${apiBase || 'NONE (Mock Mode)'}`)
  
  // 1. 如果配置了后端地址，直接转发请求，不在前端验证本地用户
  if (apiBase) {
    const token = readToken(event)
    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    } else {
      console.log('[jobs.get] ⚠️ No token found for backend request')
    }
    
    try {
      console.log(`[jobs.get] Forwarding to: ${apiBase}/jobs/${jobId}`)
      const resp = await fetch(`${apiBase}/jobs/${jobId}`, { headers })
      
      if (!resp.ok) {
        console.error(`[jobs.get] Backend error: ${resp.status} ${resp.statusText}`)
        // 如果后端返回 401，这里也会抛出 401
        throw createError({ statusCode: resp.status, statusMessage: '查询任务失败' })
      }
      
      const data = await resp.json()
      return data
    } catch (e: any) {
      console.error('[jobs.get] Request failed:', e.message)
      throw createError({ 
        statusCode: e.statusCode || 500, 
        statusMessage: e.statusMessage || e.message 
      })
    }
  }

  // 2. Mock 模式下才验证本地用户
  const user = readUserFromEvent(event)
  if (!user) {
    console.warn('[jobs.get] Mock mode: User not logged in locally')
    throw createError({ statusCode: 401, statusMessage: '未登录，无法查询任务' })
  }

  const job = getJobById(jobId, user.id)
  if (!job) {
    return { status: 'error', message: '未找到任务或无权限' }
  }
  return { job_id: jobId, status: job.status, result: job.result, message: job.message }
})
