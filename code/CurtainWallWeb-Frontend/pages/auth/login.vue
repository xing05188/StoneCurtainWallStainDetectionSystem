<template>
  <div class="auth-grid">
    <div class="page-card auth-card">
      <h1 class="card-title">登录</h1>
      <p class="card-sub">使用账户登录后将跳转到检测页面。</p>
      <form class="form" @submit.prevent="handleSubmit">
        <label class="form-field">
          <span class="form-label">用户名</span>
          <input v-model="form.username" type="text" required placeholder="请输入用户名" />
        </label>
        <label class="form-field">
          <span class="form-label">密码</span>
          <input v-model="form.password" type="password" required placeholder="请输入密码" />
        </label>
        <div class="form-actions">
          <button class="btn" type="submit" :disabled="loading">{{ loading ? '登录中...' : '登录' }}</button>
          <NuxtLink class="ghost-btn" to="/auth/register">去注册</NuxtLink>
        </div>
        <p v-if="error" class="form-error">{{ error }}</p>
        <p v-if="message" class="form-ok">{{ message }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

if (process.client) {
  navigateTo('/login', { replace: true })
}
</script>

<style scoped>
.auth-grid {
  width: 100%;
}
.auth-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-label {
  color: var(--muted);
  font-size: 13px;
}
.form input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
}
.form-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.form-error {
  color: #b91c1c;
  font-size: 13px;
  margin: 0;
}
.form-ok {
  color: #047857;
  font-size: 13px;
  margin: 0;
}
</style>
