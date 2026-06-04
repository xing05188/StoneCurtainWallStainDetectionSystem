/**
 * 接口名称: 获取检测历史列表
 * 接口定义: GET /api/corrosion/history -> GET {apiBase}/history
 * 输入内容: Query params: page, limit, type
 * 输出内容: JSON { success: boolean; data?: { page: number; total: number; list: Array<HistoryItem> } }
 * 备注: 支持分页和类型筛选（single/batch/all）
 */
import { defineEventHandler, getQuery, createError, getCookie } from 'h3'

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
  
  // 获取查询参数
  const query = getQuery(event)
  const page = query.page || '1'
  const limit = query.limit || '10'
  const type = query.type || 'all'
  
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
  
  // 构建查询字符串
  const queryString = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    type: String(type)
  }).toString()
  
  try {
    const resp = await fetch(`${apiBase}/history?${queryString}`, {
      method: 'GET',
      headers
    })
    
    if (!resp.ok) {
      throw createError({ 
        statusCode: resp.status, 
        statusMessage: '获取历史记录失败' 
      })
    }
    
    return await resp.json()
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || '获取历史记录异常'
    })
  }
})
