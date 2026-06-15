import { computed } from 'vue'

interface AuthUser {
  id: string
  username: string
  email?: string
  role?: string
}

interface AuthResponse {
  success: boolean
  message?: string
  token?: string
  user?: AuthUser
}

const restorePromise: { value?: Promise<void> } = {}
const TOKEN_KEY = 'authToken'
const USER_KEY = 'auth_user'
const AUTH_STATE_KEY = 'userAuth'

const readStoredJSON = <T>(key: string): T | null => {
  if (!process.client) return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : null
  } catch {
    return null
  }
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const loading = useState<boolean>('auth-loading', () => false)
  const error = useState<string>('auth-error', () => '')
  const tokenCookie = useCookie<string | null>('auth_token', { 
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7天
  })
  const userCookie = useCookie<AuthUser | null>('auth_user', { 
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7天
  })
  const isAuthenticated = computed(() => Boolean(tokenCookie.value && user.value))

  const setSession = (payload: { token: string; user: AuthUser }) => {
    tokenCookie.value = payload.token
    userCookie.value = payload.user
    user.value = payload.user
    if (process.client) {
      localStorage.setItem(TOKEN_KEY, payload.token)
      localStorage.setItem(USER_KEY, JSON.stringify(payload.user))
      localStorage.setItem('email', payload.user.email || payload.user.username)
      localStorage.setItem(AUTH_STATE_KEY, JSON.stringify({
        is_superuser: payload.user.role === 'admin',
        role: payload.user.role,
        username: payload.user.username,
        email: payload.user.email || payload.user.username
      }))
    }
    console.log('[useAuth] ✅ Session set, token length:', payload.token.length)
    console.log('[useAuth] ✅ User:', payload.user.username)
  }

  const clearSession = () => {
    tokenCookie.value = null
    userCookie.value = null
    user.value = null
    if (process.client) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(AUTH_STATE_KEY)
    }
  }

  const restoreSession = async () => {
    if (restorePromise.value) return restorePromise.value
    restorePromise.value = (async () => {
      if (userCookie.value && !user.value) {
        user.value = userCookie.value
      }
      if (!user.value && process.client) {
        const storedUser = readStoredJSON<AuthUser>(USER_KEY)
        if (storedUser) {
          user.value = storedUser
        }
      }
      if (!tokenCookie.value && process.client) {
        const storedToken = localStorage.getItem(TOKEN_KEY)
        if (storedToken) {
          tokenCookie.value = storedToken
        }
      }
      if (tokenCookie.value && !user.value) {
        try {
          const profile = await $fetch<AuthResponse>('/api/auth/profile', {
            headers: { Authorization: `Bearer ${tokenCookie.value}` }
          })
          if (profile?.success && profile.user) {
            setSession({ token: tokenCookie.value as string, user: profile.user })
          } else {
            clearSession()
          }
        } catch (err) {
          console.warn('restoreSession failed', err)
          clearSession()
        }
      }
    })()
    return restorePromise.value
  }

  const login = async (payload: { username: string; password: string }) => {
    loading.value = true
    error.value = ''
    try {
      const res = await $fetch<any>('/api/auth/login', { method: 'POST', body: payload })
      // 处理嵌套的 data 结构
      const token = res?.data?.token || res?.token
      const user = res?.data?.user || res?.user
      if (res?.success && token && user) {
        setSession({ token, user })
        return { success: true }
      }
      const msg = res?.message || '登录失败'
      error.value = msg
      return { success: false, message: msg }
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || '登录异常'
      error.value = msg
      return { success: false, message: msg }
    } finally {
      loading.value = false
    }
  }

  const register = async (payload: { username: string; password: string; confirm?: string }) => {
    loading.value = true
    error.value = ''
    try {
      const res = await $fetch<any>('/api/auth/register', { method: 'POST', body: payload })
      // 处理嵌套的 data 结构
      const token = res?.data?.token || res?.token
      const user = res?.data?.user || res?.user
      if (res?.success && token && user) {
        setSession({ token, user })
        return { success: true }
      }
      const msg = res?.message || '注册失败'
      error.value = msg
      return { success: false, message: msg }
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || '注册异常'
      error.value = msg
      return { success: false, message: msg }
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    clearSession()
  }

  if (process.client) restoreSession()

  return {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    restoreSession
  }
}
