import { defineEventHandler, proxyRequest } from 'h3'

export default defineEventHandler(async (event) => {
  const path = event.path
  console.log(`[Proxy Middleware] Received request: ${event.method} ${path}`)
  const runtimeConfig = useRuntimeConfig(event)

  if (
    path.startsWith('/api/auth') ||
    path.startsWith('/api/corrosion') ||
    path.startsWith('/api/proxy-image') ||
    path.startsWith('/api/detect')
  ) {
    return
  }
  
  // 配置映射
  const config = {
    '/m-api': {
      target: String((runtimeConfig as { monitorServiceOrigin?: string }).monitorServiceOrigin || 'http://8.159.143.133:8080'),
      rewrite: (p: string) => p.replace(/^\/m-api/, '/api/v1') // 监控服务 API 统一转到 /api/v1
    },
    '/api/detect': {
      target: 'http://8.153.161.229:8003',
      rewrite: (p: string) => p // 玻璃破裂/平整度检测，保持路径不变
    },
    '/api': {
      target: 'http://8.159.143.133:8000',
      rewrite: (p: string) => p.replace(/^\/api/, '') // 去掉 /api 前缀
    },
    '/predict': {
      target: 'http://47.102.208.89:8007',
      rewrite: (p: string) => p.replace(/^\/predict/, '') // 去掉 /predict 前缀
    },
    '/history': {
      target: 'http://47.102.208.89:8007',
      rewrite: (p: string) => p.replace(/^\/history/, '') // 去掉 /history 前缀
    },
    '/oss': {
      target: 'http://8.159.143.133:9000',
      rewrite: (p: string) => p.replace(/^\/oss/, '') // 去掉 /oss 前缀
    },
    '/crackdetection': {
      target: 'http://110.42.214.164:8001',
      rewrite: (p: string) => p.replace(/^\/crackdetection/, '') // 去掉 /crackdetection 前缀
    }
  }

  for (const [prefix, rule] of Object.entries(config)) {
    if (path.startsWith(prefix)) {
      const newPath = rule.rewrite(path)
      const targetUrl = rule.target + newPath
      
      console.log(`[Proxy Middleware] Matching prefix '${prefix}'. Rewriting path: ${path} -> ${newPath}`)
      console.log(`[Proxy Middleware] Target URL: ${targetUrl}`)
      
      try {
        const host = new URL(rule.target).host
        // console.log(`[Proxy Middleware] Setting Host header to: ${host}`)
        
        return await proxyRequest(event, targetUrl, {
          headers: {
            host: host
          },
          onResponse(output, response) {
             console.log(`[Proxy Middleware] Response from ${targetUrl}: ${response.status} ${response.statusText}`)
          }
        })
      } catch (error) {
        console.error(`[Proxy Middleware Error] Failed to proxy ${path} to ${targetUrl}:`, error)
        throw error
      }
    }
  }
  // console.log(`[Proxy Middleware] No matching prefix for ${path}`)
})
