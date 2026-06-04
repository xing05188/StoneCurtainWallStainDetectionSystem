/**
 * 接口名称: 获取模型列表
 * 接口定义: GET /api/corrosion/models -> GET {apiBase}/models
 * 输入内容: 无
 * 输出内容: JSON { success: boolean; models?: Array<{ key: string; name: string }> }
 * 备注: 复用全站登录态，通过 Authorization header 或 auth_token cookie 转发。
 */
import { defineEventHandler, createError, getCookie } from 'h3'

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

  const token = readToken(event)
  const headers: Record<string, string> = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const resp = await fetch(`${apiBase}/models`, { headers })
  if (!resp.ok) {
    throw createError({ statusCode: resp.status, statusMessage: '获取模型列表失败' })
  }
  return await resp.json()
})
