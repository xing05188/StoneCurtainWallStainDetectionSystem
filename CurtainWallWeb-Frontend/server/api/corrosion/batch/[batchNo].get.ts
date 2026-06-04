/**
 * 接口名称: 获取批次详情
 * 路径: GET /api/corrosion/batch/:batchNo -> GET {apiBase}/history/batches/:batchNo
 * 输入: batchNo 路径参数
 * 输出: { success: boolean; data: { batch_info, tasks: [] } }
 * 说明: 按用户鉴权，未配置 apiBase 时使用本地 mock。
 */
import { defineEventHandler, createError, getCookie } from 'h3'
import { readUserFromEvent } from '../_store'

const readToken = (event: any) => {
  const auth = event.node.req.headers['authorization'] || ''
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7)
  }
  const cookieToken = getCookie(event, 'auth_token')
  return cookieToken || ''
}

export default defineEventHandler(async (event) => {
  const batchNo = event.context.params?.batchNo
  if (!batchNo) {
    throw createError({ statusCode: 400, statusMessage: '缺少batchNo' })
  }

  const config = useRuntimeConfig()
  const apiBase = config.public.corrosionApiBase || 'http://8.153.161.229:18000'

  // 1. 如果配置了后端地址，直接转发请求
  if (apiBase) {
    const token = readToken(event)
    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    try {
      console.log(`[batch.get] Forwarding to: ${apiBase}/history/batches/${batchNo}`)
      const resp = await fetch(`${apiBase}/history/batches/${batchNo}`, { headers })
      
      if (!resp.ok) {
        console.error(`[batch.get] Backend error: ${resp.status} ${resp.statusText}`)
        throw createError({ statusCode: resp.status, statusMessage: '查询批次失败' })
      }
      
      return await resp.json()
    } catch (e: any) {
      console.error('[batch.get] Request failed:', e.message)
      throw createError({ 
        statusCode: e.statusCode || 500, 
        statusMessage: e.statusMessage || e.message 
      })
    }
  }

  // 2. Mock 模式 (暂不完全实现复杂的 Mock 批次查询，仅返回基本信息)
  // 如果需要完善 Mock，需在 _store.ts 中存储 batch 和 tasks
  const user = readUserFromEvent(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '未登录' })
  }
  
  // 这里简单返回 Mock 数据，实际开发中建议优先联调后端
  return {
    success: true,
    data: {
      batch_info: {
        batch_no: batchNo,
        name: 'Mock Batch',
        progress: '1/1',
        status: 'done'
      },
      tasks: []
    }
  }
})
