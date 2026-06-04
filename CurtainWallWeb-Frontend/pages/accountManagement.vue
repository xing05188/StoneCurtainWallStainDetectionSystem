<template>
  <div class="p-4 space-y-8">
    <!-- 修改用户名 -->
    <el-card header="更改用户名">
      <el-form :model="usernameForm" ref="usernameFormRef" label-width="100px">
        <el-form-item label="当前用户名">
          <el-input :model-value="currentUsername" disabled />
        </el-form-item>
        <el-form-item label="新用户名" prop="new_username" :rules="[{ required: true, message: '请输入新用户名', trigger: 'blur' }]">
          <el-input v-model="usernameForm.new_username" placeholder="请输入新用户名" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submitUsername">提交修改</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 修改密码 -->
    <el-card header="更改密码">
      <el-form :model="passwordForm" ref="passwordFormRef" label-width="100px" :rules="passwordRules">
        <el-form-item label="旧密码" prop="old_password">
          <el-input v-model="passwordForm.old_password" placeholder="请输入旧密码" show-password />
        </el-form-item>
        <el-form-item label="新密码" prop="new_password">
          <el-input v-model="passwordForm.new_password" placeholder="请输入新密码" show-password />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirm_password">
          <el-input v-model="passwordForm.confirm_password" placeholder="请再次输入新密码" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submitPassword">提交修改</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { jwtDecode } from 'jwt-decode'
import { userState } from '@/composables/useUserState'

// 响应式当前用户名
const currentUsername = ref('')

// 抽取更新当前用户名的函数
const updateCurrentUsername = () => {
  const token = localStorage.getItem('authToken') || ''
  console.log('Current token:', token) // 调试
  const decoded = token ? jwtDecode<{ username: string }>(token) : { username: '' }
  console.log('Decoded username:', decoded.username) // 调试
  currentUsername.value = decoded.username || ''
  userState.name = decoded.username
}

// 组件挂载时初始化用户名
onMounted(() => {
  updateCurrentUsername()
})

// 用户名表单
const usernameForm = ref({
  new_username: '',
})
const usernameFormRef = ref()

// 密码表单
const passwordForm = ref({
  old_password: '',
  new_password: '',
  confirm_password: '',
})
const passwordFormRef = ref()

// 密码验证规则
const passwordRules = {
  old_password: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  new_password: [{ required: true, message: '请输入新密码', trigger: 'blur' }],
  confirm_password: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule: any, value: string, callback: any) => {
        if (value !== passwordForm.value.new_password) {
          callback(new Error('两次输入的新密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 类型定义
interface UpdateUsernameResponse {
  code: number
  message: string
  data: {
    token: string
  }
}

// 提交新用户名
const submitUsername = () => {
  usernameFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    try {
      const res = await $fetch<UpdateUsernameResponse>('/api/account/custom/updateUsername', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: {
          new_username: usernameForm.value.new_username
        },
      })
      console.log(res.data?.token)
      // 替换本地 token 并更新用户名
      if (res.data?.token) {
        localStorage.setItem('authToken', res.data.token)
        await new Promise(resolve => setTimeout(resolve, 50))
        updateCurrentUsername()  // **更新用户名显示**
        usernameForm.value.new_username = '' // 清空输入框
      }

      ElMessage.success(res.message || '用户名修改成功')
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || '修改失败，请检查输入'
      ElMessage.error(msg)
      console.error(err)
    }
  })
}

// 提交新密码
const submitPassword = () => {
  passwordFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    try {
      // 弹出确认框
      await ElMessageBox.confirm(
        '确定要修改密码吗？',
        '确认修改',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )
      const { old_password, new_password } = passwordForm.value
      const token = localStorage.getItem("authToken");
      console.log("当前token:", token);
      const res = await $fetch<{ code: number; message: string }>('/api/account/custom/updatePassword', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: {
          old_password,
          new_password
        },
      })

      ElMessage.success(res.message || '密码修改成功')
      passwordForm.value.old_password = ''
      passwordForm.value.new_password = ''
      passwordForm.value.confirm_password = ''
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || '修改失败，请检查输入'
      ElMessage.error(msg)
      console.error(err)
    }
  })
}
</script>

<style scoped>
.p-4 {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  width: 100vw;
  box-sizing: border-box;
}

.el-card {
  width: 100%;
  max-width: 600px;
}
</style>
