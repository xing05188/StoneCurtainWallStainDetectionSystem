/**
 * 接口名称: 批量/数据集检测
 * 路径: POST /api/corrosion/batch -> POST {apiBase}/detect/batch
 * 输入: FormData { files[], dataset_name?, model, conf, iou }
 * 输出: { success: boolean; data: { batch_no, total_files, status, message } }
 * 说明: 按用户鉴权，未配置 apiBase 时使用本地 mock。
 */
import { defineEventHandler, readMultipartFormData, createError, getCookie } from 'h3'
import { readUserFromEvent, createMockBatch } from './_store'

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
  const config = useRuntimeConfig()
  const apiBase = config.public.corrosionApiBase || 'http://8.153.161.229:18000'

  // 如果配置了后端地址，直接转发请求
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
        // 注意：后端接受 files 字段
        fd.append('files', blob, windowsFilename)
      } else {
        fd.append(part.name || '', part.data.toString())
      }
    }

    const token = readToken(event)
    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    console.log(`[batch.post] Forwarding to: ${apiBase}/detect/batch`)
    const resp = await fetch(`${apiBase}/detect/batch`, { method: 'POST', body: fd, headers })
    
    if (!resp.ok) {
      const errorText = await resp.text()
      console.error(`[batch.post] Backend error: ${resp.status} ${resp.statusText} - ${errorText}`)
      throw createError({ 
        statusCode: resp.status, 
        statusMessage: `后端批量检测接口调用失败: ${errorText}` 
      })
    }
    return await resp.json()
  }

  // 本地 Mock 逻辑
  const user = readUserFromEvent(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '未登录，无法进行检测' })
  }

  const form = await readMultipartFormData(event)
  if (!form) {
    throw createError({ statusCode: 400, statusMessage: '未收到上传数据' })
  }

  const params: any = { model: 'yolo11s.pt', conf: 0.25, iou: 0.45 }
  const fileParts: any[] = []

  for (const part of form) {
    if (part.filename) {
      fileParts.push(part)
    } else {
      params[part.name || ''] = part.data.toString()
    }
  }

  if (fileParts.length === 0) {
    throw createError({ statusCode: 400, statusMessage: '缺少文件' })
  }

  // 创建 Mock 批次
  const batch = createMockBatch(user.id, user.username, fileParts, {
    model: String(params.model),
    conf: Number(params.conf),
    iou: Number(params.iou),
    imgsz: Number(params.imgsz ?? 640),
    max_det: Number(params.max_det ?? 300)
  })

  return {
    success: true,
    data: {
      batch_no: batch.batchNo,
      total_files: batch.totalCount,
      status: batch.status,
      message: `已接收 ${batch.totalCount} 张图片，开始后台处理 (Mock)`
    }
  }
})
