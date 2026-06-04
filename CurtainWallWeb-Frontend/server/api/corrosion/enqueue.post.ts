/**
 * 接口名称: 锈蚀检测入队
 * 路径: POST /api/corrosion/enqueue -> POST {apiBase}/detect/enqueue
 * 输入: FormData { file, model, conf, iou, imgsz, max_det }
 * 输出: { success: boolean; job_id?: string }
 * 说明: 按用户鉴权，队列记录与账户关联；未配置 apiBase 时使用本地 mock 并立即完成。
 */
import { defineEventHandler, readMultipartFormData, createError, getCookie } from 'h3'
import { readUserFromEvent, createMockJob } from './_store'

const readToken = (event: any) => {
  // 优先从 Authorization header 读取
  const auth = event.node.req.headers['authorization'] || ''
  console.log('[enqueue.post] Authorization header:', auth || 'NOT FOUND')
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7)
    console.log('[enqueue.post] Token from header:', token.substring(0, 20) + '...')
    return token
  }
  // 然后从 cookie 读取
  const cookieToken = getCookie(event, 'auth_token')
  console.log('[enqueue.post] Token from cookie:', cookieToken ? cookieToken.substring(0, 20) + '...' : 'NOT FOUND')
  return cookieToken || ''
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiBase = config.public.corrosionApiBase || 'http://8.153.161.229:18000'

  // 如果配置了后端地址，直接转发请求，不在前端验证
  if (apiBase) {
    const form = await readMultipartFormData(event)
    if (!form) {
      throw createError({ statusCode: 400, statusMessage: '未收到上传数据' })
    }

    const fd = new FormData()
    for (const part of form) {
      if (part.filename) {
        // 将文件名中的 / 替换为 \ (macOS 转 Windows 路径格式)
        const windowsFilename = part.filename.replace(/\//g, '\\')
        const blob = new Blob([new Uint8Array(part.data)], { type: part.type || 'application/octet-stream' })
        fd.append(part.name || 'file', blob, windowsFilename)
      } else {
        fd.append(part.name || '', part.data.toString())
      }
    }

    // 读取 token 并转发给后端
    const token = readToken(event)
    console.log('[enqueue.post] Token found:', token ? '✅ Yes' : '❌ No')
    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
      console.log('[enqueue.post] Forwarding to backend with Authorization header')
    } else {
      console.log('[enqueue.post] ⚠️ WARNING: No token to forward!')
    }

    console.log('[enqueue.post] Calling:', `${apiBase}/detect/enqueue`)
    const resp = await fetch(`${apiBase}/detect/enqueue`, { method: 'POST', body: fd, headers })
    if (!resp.ok) {
      const errorText = await resp.text()
      throw createError({ 
        statusCode: resp.status, 
        statusMessage: `后端入队接口调用失败: ${errorText}` 
      })
    }
    return await resp.json()
  }

  // 未配置后端时使用本地 Mock
  const user = readUserFromEvent(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '未登录，无法进行检测' })
  }

  const form = await readMultipartFormData(event)
  if (!form) {
    throw createError({ statusCode: 400, statusMessage: '未收到上传数据' })
  }

  const params: any = { model: '', conf: 0.25, iou: 0.45, imgsz: 640, max_det: 300 }
  let filePart: any = null

  for (const part of form) {
    if (part.filename) {
      filePart = part
    } else {
      params[part.name || 'model'] = part.data.toString()
    }
  }

  if (!filePart) {
    throw createError({ statusCode: 400, statusMessage: '缺少文件' })
  }

  const job = createMockJob(user.id, user.username, { data: filePart.data, filename: filePart.filename }, {
    model: String(params.model || 'yolo11s.pt'),
    conf: Number(params.conf ?? 0.25),
    iou: Number(params.iou ?? 0.45),
    imgsz: Number(params.imgsz ?? 640),
    max_det: Number(params.max_det ?? 300)
  })
  return { success: true, job_id: job.id, status: job.status }
})
