<script lang="ts" setup>
import type { FormRules } from "element-plus"
import { supabase } from "@@/apis/supabase/client"
import { Lock } from "@element-plus/icons-vue"

const router = useRouter()

const loading = ref(false)
const checking = ref(true)
const canReset = ref(false)

const formRef = useTemplateRef("formRef")

const formData = reactive({
  password: "",
  confirmPassword: ""
})

function validateConfirmPassword(_rule: unknown, value: string, callback: (error?: Error) => void) {
  if (!value) {
    callback(new Error("请再次输入密码"))
    return
  }
  if (value !== formData.password) {
    callback(new Error("两次输入密码不一致"))
    return
  }
  callback()
}

const formRules: FormRules = {
  password: [
    { required: true, message: "请输入新密码", trigger: "blur" },
    { min: 6, max: 64, message: "长度在 6 到 64 个字符", trigger: "blur" }
  ],
  confirmPassword: [
    { required: true, message: "请再次输入密码", trigger: "blur" },
    { validator: validateConfirmPassword, trigger: "blur" }
  ]
}

async function checkRecoverySession() {
  const { data } = await supabase.auth.getSession()
  canReset.value = Boolean(data.session)
  checking.value = false
}

async function handleResetPassword() {
  formRef.value?.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      const { error } = await supabase.auth.updateUser({ password: formData.password })
      if (error) {
        ElMessage.error(error.message)
        return
      }

      ElMessage.success("密码重置成功，请重新登录")
      await supabase.auth.signOut()
      router.replace("/login")
    } finally {
      loading.value = false
    }
  })
}

void checkRecoverySession()
</script>

<template>
  <div class="reset-password-page">
    <div class="card">
      <h1>重置密码</h1>
      <p v-if="checking" class="tip">
        正在校验重置链接...
      </p>
      <p v-else-if="!canReset" class="tip error">
        重置链接无效或已过期，请重新发送重置邮件。
      </p>

      <el-form
        v-else
        ref="formRef"
        :model="formData"
        :rules="formRules"
        @keyup.enter="handleResetPassword"
      >
        <el-form-item prop="password">
          <el-input
            v-model.trim="formData.password"
            type="password"
            placeholder="新密码"
            :prefix-icon="Lock"
            show-password
            size="large"
          />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input
            v-model.trim="formData.confirmPassword"
            type="password"
            placeholder="确认新密码"
            :prefix-icon="Lock"
            show-password
            size="large"
          />
        </el-form-item>
        <el-button type="primary" size="large" :loading="loading" @click="handleResetPassword">
          提交新密码
        </el-button>
      </el-form>

      <el-button text @click="router.replace('/login')">
        返回登录
      </el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.reset-password-page {
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

    h1 {
      margin: 0 0 12px;
      text-align: center;
      font-size: 24px;
    }

    .tip {
      margin: 0 0 16px;
      font-size: 14px;
      color: var(--el-text-color-regular);
      text-align: center;
    }

    .error {
      color: var(--el-color-danger);
    }

    .el-button {
      width: 100%;
      margin-top: 6px;
    }
  }
}
</style>
