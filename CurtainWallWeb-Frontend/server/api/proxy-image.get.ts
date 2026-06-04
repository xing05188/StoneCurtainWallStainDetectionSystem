/**
 * 图片代理接口
 * 用于避免浏览器直接访问后端图片时的 CORS 问题
 * 
 * 接口：GET /api/proxy-image?path=/images/xxx
 * 功能：从后端获取图片并返回给前端
 */
import { defineEventHandler, getQuery, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const imagePath = query.path as string

  if (!imagePath) {
    throw createError({ statusCode: 400, statusMessage: 'Missing image path' })
  }

  const config = useRuntimeConfig()
  const apiBase = config.public.corrosionApiBase || 'http://8.153.161.229:18000'
  
  // 确保路径以 / 开头
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
  const targetUrl = `${apiBase}${normalizedPath}`

  try {
    const response = await fetch(targetUrl)
    
    if (!response.ok) {
      throw createError({ 
        statusCode: response.status, 
        statusMessage: `Failed to fetch image from backend: ${response.statusText}` 
      })
    }

    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 设置正确的 Content-Type
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    event.node.res.setHeader('Content-Type', contentType)
    event.node.res.setHeader('Cache-Control', 'public, max-age=3600')

    return buffer
  } catch (error: any) {
    console.error('[proxy-image] Error fetching image:', targetUrl, error)
    throw createError({ 
      statusCode: error.statusCode || 500, 
      statusMessage: error.statusMessage || 'Failed to fetch image' 
    })
  }
})
