<script lang="ts" setup>
import { supabase } from "@@/apis/supabase/client"
import { useUserStore } from "@/pinia/stores/user"

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const status = ref<"loading" | "success" | "error">("loading")
const message = ref("正在校验登录状态...")

function getAuthParam(key: string) {
  const searchParams = new URLSearchParams(window.location.search)
  const searchValue = searchParams.get(key)
  if (searchValue) return searchValue

  const rawHash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash
  const hashParts = rawHash.split("#")
  for (const part of hashParts) {
    const queryPart = part.includes("?") ? part.split("?")[1] : part
    const params = new URLSearchParams(queryPart)
    const value = params.get(key)
    if (value) return value
  }

  const routeValue = route.query[key]
  return typeof routeValue === "string" ? routeValue : undefined
}

async function handleAuthCallback() {
  try {
    const accessToken = getAuthParam("access_token")
    const refreshToken = getAuthParam("refresh_token")
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
      if (error) {
        status.value = "error"
        message.value = error.message
        return
      }
    }

    const code = getAuthParam("code")
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        status.value = "error"
        message.value = error.message
        return
      }
    }

    // Fallback: read current session (covers implicit/hash callbacks too).
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      status.value = "error"
      message.value = error.message
      return
    }

    const token = data.session?.access_token
    if (!token) {
      status.value = "error"
      message.value = "未获取到有效会话，请返回登录页重试。"
      return
    }

    userStore.setToken(token)
    status.value = "success"
    message.value = "验证成功，正在跳转..."
    router.replace("/")
  } catch {
    status.value = "error"
    message.value = "回调处理失败，请重新登录。"
  }
}

void handleAuthCallback()
</script>

<template>
  <div class="auth-callback-page">
    <div class="card">
      <h1>账号验证</h1>
      <p :class="status">
        {{ message }}
      </p>
      <el-button v-if="status === 'error'" type="primary" @click="router.replace('/login')">
        返回登录
      </el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.auth-callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-lighter);

  .card {
    width: min(90vw, 460px);
    padding: 28px;
    border-radius: 12px;
    background: var(--el-bg-color);
    box-shadow: var(--el-box-shadow-light);
    text-align: center;

    h1 {
      margin: 0 0 12px;
      font-size: 24px;
      color: var(--el-text-color-primary);
    }

    p {
      margin: 0 0 18px;
      font-size: 14px;
    }

    .loading {
      color: var(--el-text-color-regular);
    }

    .success {
      color: var(--el-color-success);
    }

    .error {
      color: var(--el-color-danger);
    }
  }
}
</style>
