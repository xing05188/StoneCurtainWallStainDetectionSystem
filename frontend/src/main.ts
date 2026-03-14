/* eslint-disable perfectionist/sort-imports */

// core
import { pinia } from "@/pinia"
import { router } from "@/router"
import { installPlugins } from "@/plugins"
import App from "@/App.vue"
// css
import "normalize.css"
import "nprogress/nprogress.css"
import "element-plus/theme-chalk/dark/css-vars.css"
import "vxe-table/lib/style.css"
import "@@/assets/styles/index.scss"
import "virtual:uno.css"

if (import.meta.env.VITE_ROUTER_HISTORY === "hash") {
  const callbackPathMap = new Set(["/auth/callback", "/reset-password"])
  const { pathname, search, hash, origin } = window.location
  const tokenHashPrefixes = ["#access_token=", "#error=", "#refresh_token="]

  if (callbackPathMap.has(pathname)) {
    if (!hash.startsWith("#/")) {
      // Convert provider callback fragment to query params under hash route.
      const query = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      const rawHash = hash.startsWith("#") ? hash.slice(1) : hash
      const hashParams = new URLSearchParams(rawHash)
      hashParams.forEach((value, key) => {
        query.set(key, value)
      })
      const queryString = query.toString()
      const target = `${origin}/#${pathname}${queryString ? `?${queryString}` : ""}`
      window.location.replace(target)
    }
  } else if (pathname === "/" && tokenHashPrefixes.some(prefix => hash.startsWith(prefix))) {
    // Some providers may still return tokens on root URL; route them to callback page.
    const query = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
    const rawHash = hash.startsWith("#") ? hash.slice(1) : hash
    const hashParams = new URLSearchParams(rawHash)
    hashParams.forEach((value, key) => {
      query.set(key, value)
    })
    const queryString = query.toString()
    window.location.replace(`${origin}/#/auth/callback${queryString ? `?${queryString}` : ""}`)
  }
}

// 创建应用实例
const app = createApp(App)

// 安装插件（全局组件、自定义指令等）
installPlugins(app)

// 安装 pinia 和 router
app.use(pinia).use(router)

// router 准备就绪后挂载应用
router.isReady().then(() => {
  app.mount("#app")
})
