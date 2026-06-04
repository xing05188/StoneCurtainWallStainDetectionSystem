/**
 * 接口名称: 获取批次详情
 * 接口定义: GET /api/corrosion/history/batches/{batchNo} -> GET {apiBase}/history/batches/{batchNo}
 * 输入内容: Path param: batchNo; Query param: status (optional)
 * 输出内容: JSON { success: boolean; data?: { batch_info: {...}, tasks: [...] } }
 * 备注: 查看批次下所有图片的检测结果
 */
import { defineEventHandler, getQuery, getRouterParam, createError, getCookie } from 'h3'

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
  const batchNo = getRouterParam(event, 'batchNo')
  if (!batchNo) {
    throw createError({ 
      statusCode: 400, 
      statusMessage: '缺少 batchNo 参数' 
    })
  }
  
  // 获取查询参数
  const query = getQuery(event)
  const status = query.status
  
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
  
  // 构建 URL
  let url = `${apiBase}/history/batches/${batchNo}`
  if (status) {
    url += `?status=${status}`
  }
  
  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers
    })
    
    if (!resp.ok) {
      throw createError({ 
        statusCode: resp.status, 
        statusMessage: '获取批次详情失败' 
      })
    }
    
    return await resp.json()
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || '获取批次详情异常'
    })
  }
})
