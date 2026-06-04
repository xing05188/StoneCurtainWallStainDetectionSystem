/**
 * 接口名称: 获取单次检测详情
 * 接口定义: GET /api/corrosion/history/single/{jobId} -> GET {apiBase}/history/single/{jobId}
 * 输入内容: Path param: jobId
 * 输出内容: JSON { success: boolean; data?: { job_id, model, status, created_at, input_image, output_image, metrics } }
 * 备注: 查看单次检测的详细信息
 */
import { defineEventHandler, getRouterParam, createError, getCookie } from 'h3'

const readToken = (event: any) => {
  const auth = event.node.req.headers['authorization'] || ''
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7)
  }
  const cookieToken = getCookie(event, 'auth_token')
  return cookieToken || ''
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiBase = config.public.corrosionApiBase || 'http://8.153.161.229:18000'
  
  // 获取路径参数
  const jobId = getRouterParam(event, 'jobId')
  if (!jobId) {
    throw createError({ 
      statusCode: 400, 
      statusMessage: '缺少 jobId 参数' 
    })
  }
  
  // 获取认证 token
  const authHeader = getHeader(event, 'authorization')
  const headers: Record<string, string> = {}
  if (authHeader) {
    headers['Authorization'] = authHeader
  } else {
    const token = readToken(event)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }
  
  try {
    const resp = await fetch(`${apiBase}/history/single/${jobId}`, {
      method: 'GET',
      headers
    })
    
    if (!resp.ok) {
      throw createError({ 
        statusCode: resp.status, 
        statusMessage: '获取单次检测详情失败' 
      })
    }
    
    return await resp.json()
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || '获取单次检测详情异常'
    })
  }
})
