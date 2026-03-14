<script lang="ts" setup>
import type { FormRules } from "element-plus"
import { supabase } from "@@/apis/supabase/client"
import ThemeSwitch from "@@/components/ThemeSwitch/index.vue"
import { Lock, Message } from "@element-plus/icons-vue"
import { useSettingsStore } from "@/pinia/stores/settings"
import { useUserStore } from "@/pinia/stores/user"
import Owl from "./components/Owl.vue"
import { useFocus } from "./composables/useFocus"

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()

const { isFocus, handleBlur, handleFocus } = useFocus()

const loginFormRef = useTemplateRef("loginFormRef")
const registerFormRef = useTemplateRef("registerFormRef")

const authMode = ref<"login" | "register">("login")
const loading = ref(false)
const oauthLoading = ref<"github" | null>(null)

const updatePasswordDialogVisible = ref(false)
const updatePasswordLoading = ref(false)

const updatePasswordFormRef = useTemplateRef("updatePasswordFormRef")

const loginFormData = reactive({
  email: "",
  password: ""
})

const registerFormData = reactive({
  email: "",
  password: "",
  confirmPassword: ""
})

const updatePasswordFormData = reactive({
  email: "",
  newPassword: "",
  confirmPassword: ""
})

const authCallbackRedirectTo = `${window.location.origin}/auth/callback`

function validateConfirmPassword(_rule: unknown, value: string, callback: (error?: Error) => void) {
  if (!value) {
    callback(new Error("请再次输入密码"))
    return
  }
  if (value !== registerFormData.password) {
    callback(new Error("两次输入密码不一致"))
    return
  }
  callback()
}

function validateUpdateConfirmPassword(_rule: unknown, value: string, callback: (error?: Error) => void) {
  if (!value) {
    callback(new Error("请再次输入新密码"))
    return
  }
  if (value !== updatePasswordFormData.newPassword) {
    callback(new Error("两次输入新密码不一致"))
    return
  }
  callback()
}

const loginFormRules: FormRules = {
  email: [
    { required: true, message: "请输入邮箱", trigger: "blur" },
    { type: "email", message: "请输入正确的邮箱格式", trigger: "blur" }
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, max: 64, message: "长度在 6 到 64 个字符", trigger: "blur" }
  ]
}

const registerFormRules: FormRules = {
  email: [
    { required: true, message: "请输入邮箱", trigger: "blur" },
    { type: "email", message: "请输入正确的邮箱格式", trigger: "blur" }
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, max: 64, message: "长度在 6 到 64 个字符", trigger: "blur" }
  ],
  confirmPassword: [
    { required: true, message: "请再次输入密码", trigger: "blur" },
    { validator: validateConfirmPassword, trigger: "blur" }
  ]
}

const updatePasswordFormRules: FormRules = {
  email: [
    { required: true, message: "请输入邮箱", trigger: "blur" },
    { type: "email", message: "请输入正确的邮箱格式", trigger: "blur" }
  ],
  newPassword: [
    { required: true, message: "请输入新密码", trigger: "blur" },
    { min: 6, max: 64, message: "长度在 6 到 64 个字符", trigger: "blur" }
  ],
  confirmPassword: [
    { required: true, message: "请再次输入新密码", trigger: "blur" },
    { validator: validateUpdateConfirmPassword, trigger: "blur" }
  ]
}

function handleLogin() {
  loginFormRef.value?.validate(async (valid) => {
    if (!valid) {
      ElMessage.error("表单校验不通过")
      return
    }
    loading.value = true

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginFormData.email,
        password: loginFormData.password
      })

      if (error) {
        ElMessage.error(error.message)
        return
      }

      const token = data.session?.access_token
      if (!token) {
        ElMessage.error("登录成功但未获取到会话 Token")
        return
      }

      userStore.setToken(token)
      ElMessage.success("登录成功")
      router.push(route.query.redirect ? decodeURIComponent(route.query.redirect as string) : "/")
    } catch {
      ElMessage.error("登录失败，请稍后重试")
    } finally {
      loading.value = false
    }
  })
}

function handleRegister() {
  registerFormRef.value?.validate(async (valid) => {
    if (!valid) {
      ElMessage.error("表单校验不通过")
      return
    }

    loading.value = true

    try {
      const { data, error } = await supabase.auth.signUp({
        email: registerFormData.email,
        password: registerFormData.password,
        options: {
          emailRedirectTo: authCallbackRedirectTo
        }
      })

      if (error) {
        ElMessage.error(error.message)
        return
      }

      const token = data.session?.access_token
      if (token) {
        userStore.setToken(token)
        ElMessage.success("注册并登录成功")
        router.push("/")
        return
      }

      ElMessage.success("注册成功，请前往邮箱完成验证后登录")
      authMode.value = "login"
      loginFormData.email = registerFormData.email
      loginFormData.password = ""
      registerFormData.password = ""
      registerFormData.confirmPassword = ""
    } catch {
      ElMessage.error("注册失败，请稍后重试")
    } finally {
      loading.value = false
    }
  })
}

async function handleOAuthLogin(provider: "github") {
  oauthLoading.value = provider
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: authCallbackRedirectTo
      }
    })

    if (error) {
      ElMessage.error(error.message)
      oauthLoading.value = null
    }
  } catch {
    ElMessage.error("第三方登录发起失败，请稍后重试")
    oauthLoading.value = null
  }
}

function handleUpdatePassword() {
  updatePasswordFormRef.value?.validate(async (valid) => {
    if (!valid) return

    updatePasswordLoading.value = true
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: updatePasswordFormData.newPassword
      })
      if (updateError) {
        ElMessage.error(updateError.message)
        return
      }

      ElMessage.success("密码修改成功，请使用新密码登录")
      await supabase.auth.signOut()
      userStore.resetToken()

      updatePasswordDialogVisible.value = false
      loginFormData.email = updatePasswordFormData.email
      loginFormData.password = ""
      updatePasswordFormData.newPassword = ""
      updatePasswordFormData.confirmPassword = ""
    } finally {
      updatePasswordLoading.value = false
    }
  })
}

async function tryRestoreSession() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return
  userStore.setToken(token)
  router.replace("/")
}

async function tryRecoverSessionFromRedirect() {
  const redirect = typeof route.query.redirect === "string" ? route.query.redirect : ""
  if (!redirect || !redirect.includes("access_token=")) return

  const normalized = redirect.startsWith("/") ? redirect.slice(1) : redirect
  const decoded = decodeURIComponent(normalized)
  const params = new URLSearchParams(decoded)
  const accessToken = params.get("access_token")
  const refreshToken = params.get("refresh_token")
  if (!accessToken || !refreshToken) return

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  })
  if (error) return

  userStore.setToken(accessToken)
  router.replace("/")
}

void tryRecoverSessionFromRedirect()
void tryRestoreSession()
</script>

<template>
  <div class="login-container">
    <ThemeSwitch v-if="settingsStore.showThemeSwitch" class="theme-switch" />
    <Owl :close-eyes="isFocus" />
    <div class="login-card">
      <div class="title">
        <img src="@@/assets/images/layouts/logo-text-2.png">
      </div>
      <div class="content">
        <el-form v-if="authMode === 'login'" ref="loginFormRef" :model="loginFormData" :rules="loginFormRules" @keyup.enter="handleLogin">
          <el-form-item prop="email">
            <el-input
              v-model.trim="loginFormData.email"
              placeholder="邮箱"
              type="email"
              tabindex="1"
              :prefix-icon="Message"
              size="large"
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model.trim="loginFormData.password"
              placeholder="密码"
              type="password"
              tabindex="2"
              :prefix-icon="Lock"
              size="large"
              show-password
              @blur="handleBlur"
              @focus="handleFocus"
            />
          </el-form-item>
          <el-button :loading="loading" type="primary" size="large" @click.prevent="handleLogin">
            登 录
          </el-button>

          <div class="login-helper-row">
            <el-button text @click="authMode = 'register'">
              没有账号？注册
            </el-button>
            <el-button text @click="updatePasswordDialogVisible = true">
              忘记密码
            </el-button>
          </div>

          <el-divider>
            第三方登录
          </el-divider>

          <div class="oauth-row">
            <el-button
              plain
              :loading="oauthLoading === 'github'"
              @click="handleOAuthLogin('github')"
            >
              <span class="github-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img">
                  <path
                    fill="currentColor"
                    d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.66-.22.66-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.21-3.37-1.21-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.56 2.35 1.11 2.92.85.09-.67.35-1.11.64-1.37-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.72 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0 1 12 6.84c.85 0 1.71.12 2.51.36 1.9-1.32 2.74-1.05 2.74-1.05.55 1.41.2 2.46.1 2.72.64.72 1.02 1.63 1.02 2.75 0 3.95-2.34 4.82-4.57 5.07.36.32.68.95.68 1.91 0 1.38-.01 2.49-.01 2.83 0 .27.17.59.67.49A10.24 10.24 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"
                  />
                </svg>
              </span>
              GitHub
            </el-button>
          </div>
        </el-form>

        <el-form
          v-else
          ref="registerFormRef"
          :model="registerFormData"
          :rules="registerFormRules"
          @keyup.enter="handleRegister"
        >
          <el-form-item prop="email">
            <el-input
              v-model.trim="registerFormData.email"
              placeholder="邮箱"
              type="email"
              tabindex="1"
              :prefix-icon="Message"
              size="large"
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model.trim="registerFormData.password"
              placeholder="密码"
              type="password"
              tabindex="2"
              :prefix-icon="Lock"
              size="large"
              show-password
              @blur="handleBlur"
              @focus="handleFocus"
            />
          </el-form-item>
          <el-form-item prop="confirmPassword">
            <el-input
              v-model.trim="registerFormData.confirmPassword"
              placeholder="确认密码"
              type="password"
              tabindex="3"
              :prefix-icon="Lock"
              size="large"
              show-password
              @blur="handleBlur"
              @focus="handleFocus"
            />
          </el-form-item>
          <el-button :loading="loading" type="primary" size="large" @click.prevent="handleRegister">
            注 册
          </el-button>

          <div class="register-helper-row">
            <el-button text @click="authMode = 'login'">
              已有账号？登录
            </el-button>
          </div>
        </el-form>
      </div>
    </div>

    <el-dialog v-model="updatePasswordDialogVisible" title="忘记密码" width="460px">
      <el-form ref="updatePasswordFormRef" :model="updatePasswordFormData" :rules="updatePasswordFormRules" label-position="top">
        <el-form-item prop="email" label="邮箱">
          <el-input
            v-model.trim="updatePasswordFormData.email"
            placeholder="请输入账号邮箱"
            type="email"
            :prefix-icon="Message"
          />
        </el-form-item>
        <el-form-item prop="newPassword" label="新密码">
          <el-input
            v-model.trim="updatePasswordFormData.newPassword"
            placeholder="请输入新密码"
            type="password"
            show-password
            :prefix-icon="Lock"
          />
        </el-form-item>
        <el-form-item prop="confirmPassword" label="确认新密码">
          <el-input
            v-model.trim="updatePasswordFormData.confirmPassword"
            placeholder="请再次输入新密码"
            type="password"
            show-password
            :prefix-icon="Lock"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="updatePasswordDialogVisible = false">
          取消
        </el-button>
        <el-button type="primary" :loading="updatePasswordLoading" @click="handleUpdatePassword">
          确认修改
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.login-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 100%;
  .theme-switch {
    position: fixed;
    top: 5%;
    right: 5%;
    cursor: pointer;
  }
  .login-card {
    width: 480px;
    max-width: 90%;
    border-radius: 20px;
    box-shadow: 0 0 10px #dcdfe6;
    background-color: var(--el-bg-color);
    overflow: hidden;
    .title {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 150px;
      img {
        height: 100%;
      }
    }
    .content {
      padding: 20px 50px 50px 50px;

      .el-button {
        width: 100%;
        margin-top: 10px;
      }

      .login-helper-row {
        margin-top: 8px;
        display: flex;
        justify-content: space-between;
      }

      .register-helper-row {
        margin-top: 8px;
        display: flex;
        justify-content: flex-end;
      }

      .oauth-row {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;

        .github-icon {
          display: inline-flex;
          align-items: center;
          margin-right: 6px;
          vertical-align: -2px;

          svg {
            width: 16px;
            height: 16px;
          }
        }

        .el-button {
          margin-top: 0;
        }
      }
    }
  }
}
</style>
