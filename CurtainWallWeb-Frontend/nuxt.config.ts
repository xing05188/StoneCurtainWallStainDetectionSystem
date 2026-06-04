// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: [process.env.NUXT_UI_PRO_PATH || '@nuxt/ui-pro'],
  modules: ['@nuxt/ui', '@nuxt/fonts', '@vueuse/nuxt', "@nuxt/image", '@element-plus/nuxt','@pinia/nuxt'],

  // plugins: [
  //   '~/plugins/cleanup.js'
  // ],
  ui: {
    global: true
  },

  devtools: { enabled: true },

  // 不开启服务端渲染
  ssr: false,

  nitro: {
    devProxy: {
      '/api/detect': {
        target: 'http://8.153.161.229:8003',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://8.159.143.133:8000',
        changeOrigin: true,
      },
      '/predict': {
        target: 'http://47.102.208.89:8007',
        changeOrigin: true
      },
      '/history': {
        target: 'http://47.102.208.89:8007',
        changeOrigin: true
      },
      '/oss': {
        target: 'http://8.159.143.133:9000',
        changeOrigin: true,
      },
      '/crackdetection': {
        target: 'http://110.42.214.164:8001',
        //target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '/m-api': {
        target: process.env.NUXT_SERVER_MONITOR_UPSTREAM || 'http://8.159.143.133:8080/api/v1',
        changeOrigin: true,
      },
      '/detection-api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      }
    }
  },

  // 添加路由配置
  app: {
    baseURL: '/',
    buildAssetsDir: '/_nuxt/',
  },

  css: ['~/assets/styles/base.css', '~/assets/styles/glass-inspection.css'],

  compatibilityDate: '2024-12-17',

  // 确保环境变量在运行时可用
  runtimeConfig: {
    // 服务端代理 `/m-api/*` 时使用的监控服务上游根地址。
    monitorServiceOrigin: process.env.NUXT_SERVER_MONITOR_UPSTREAM || 'http://8.159.143.133:8080',
    apiBase: process.env.NUXT_API_BASE_URL || 'http://8.159.143.133:8000',
    corrosionApiBase: process.env.NUXT_CORROSION_API_BASE_URL || 'http://8.153.161.229:18000',
    glassDetectionApiBase: process.env.NUXT_GLASS_DETECTION_API_BASE || 'http://47.102.208.89:8007',
    benchmarkPath: process.env.BENCHMARK_PATH || '/benchmarks',

    public: {
      apiBase: process.env.NUXT_API_BASE_URL || 'http://8.159.143.133:8000',
      corrosionApiBase: process.env.NUXT_CORROSION_API_BASE_URL || 'http://8.153.161.229:18000',
      glassDetectionApiBase: process.env.NUXT_GLASS_DETECTION_API_BASE || 'http://8.153.161.229:8003',
      benchmarkPath: process.env.BENCHMARK_PATH || '/benchmarks',
      serverMonitorApiPrefix: process.env.NUXT_PUBLIC_SERVER_MONITOR_PREFIX || '/m-api',
      serverMonitorBase: process.env.NUXT_PUBLIC_SERVER_MONITOR_BASE || ''
    }
  },

  image: {
    domains: ['8.159.143.133', '8.153.161.229', '110.42.214.164', '47.102.208.89']
  }
})