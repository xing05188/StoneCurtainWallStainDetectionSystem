<script lang="ts" setup>
import { supabase } from "@@/apis/supabase/client"
import { Message, UserFilled } from "@element-plus/icons-vue"
import { useUserStore } from "@/pinia/stores/user"

const userStore = useUserStore()

const loading = ref(true)

const profile = reactive({
  email: "-",
  username: "-",
  userId: "-",
  createdAt: "-",
  confirmedAt: "-",
  lastSignInAt: "-",
  providers: [] as string[],
  avatarUrl: ""
})

const avatarSrc = computed(() => profile.avatarUrl || undefined)

function formatTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString()
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : ""
}

async function loadProfile() {
  loading.value = true
  try {
    const [{ data: userResp }, { data: sessionResp }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getSession()
    ])

    const user = userResp.user
    const session = sessionResp.session
    const userMeta = (user?.user_metadata || {}) as Record<string, unknown>
    const appMeta = (user?.app_metadata || {}) as Record<string, unknown>

    const email = user?.email || "-"
    const username
      = userStore.username
        || toStringValue(userMeta.user_name)
        || toStringValue(userMeta.preferred_username)
        || toStringValue(userMeta.full_name)
        || (email.includes("@") ? email.split("@")[0] : email)

    profile.email = email
    profile.username = username || "-"
    profile.userId = user?.id || "-"
    profile.createdAt = formatTime(user?.created_at)
    profile.confirmedAt = formatTime(user?.confirmed_at || null)
    profile.lastSignInAt = formatTime(session?.user?.last_sign_in_at)
    profile.providers = Array.isArray(appMeta.providers) ? appMeta.providers.map(item => String(item)) : []
    profile.avatarUrl = toStringValue(userMeta.avatar_url)
    userStore.setAvatar(profile.avatarUrl)
  } finally {
    loading.value = false
  }
}

const hasEmailProvider = computed(() => profile.providers.includes("email"))
const hasGithubProvider = computed(() => profile.providers.includes("github"))

void loadProfile()
</script>

<template>
  <div class="profile-page">
    <el-row :gutter="16" class="top-row">
      <el-col :xs="24" :md="8">
        <el-card shadow="hover" class="profile-card">
          <div class="avatar-wrap">
            <el-avatar :icon="UserFilled" :src="avatarSrc" :size="86" />
          </div>
          <h2>{{ profile.username }}</h2>
          <p class="sub">
            个人信息主页
          </p>

          <div class="providers-wrap" v-if="profile.providers.length">
            <el-tooltip v-if="hasEmailProvider" content="Email" placement="top">
              <div class="provider-icon email-icon" aria-label="email-provider">
                <el-icon><Message /></el-icon>
              </div>
            </el-tooltip>
            <el-tooltip v-if="hasGithubProvider" content="GitHub" placement="top">
              <div class="provider-icon github-icon" aria-label="github-provider">
                <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.66-.22.66-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.21-3.37-1.21-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.56 2.35 1.11 2.92.85.09-.67.35-1.11.64-1.37-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.72 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0 1 12 6.84c.85 0 1.71.12 2.51.36 1.9-1.32 2.74-1.05 2.74-1.05.55 1.41.2 2.46.1 2.72.64.72 1.02 1.63 1.02 2.75 0 3.95-2.34 4.82-4.57 5.07.36.32.68.95.68 1.91 0 1.38-.01 2.49-.01 2.83 0 .27.17.59.67.49A10.24 10.24 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"
                  />
                </svg>
              </div>
            </el-tooltip>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="16">
        <el-card shadow="hover" class="info-card">
          <template #header>
            <div class="card-header">
              <span>账号信息</span>
              <el-button text @click="loadProfile">
                刷新
              </el-button>
            </div>
          </template>

          <el-skeleton :loading="loading" animated :rows="5">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="用户名">
                {{ profile.username }}
              </el-descriptions-item>
              <el-descriptions-item label="邮箱">
                {{ profile.email }}
              </el-descriptions-item>
              <el-descriptions-item label="用户 ID">
                {{ profile.userId }}
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">
                {{ profile.createdAt }}
              </el-descriptions-item>
              <el-descriptions-item label="确认时间">
                {{ profile.confirmedAt }}
              </el-descriptions-item>
              <el-descriptions-item label="最近登录">
                {{ profile.lastSignInAt }}
              </el-descriptions-item>
              <el-descriptions-item label="登录方式">
                <div class="provider-inline-icons">
                  <div v-if="hasEmailProvider" class="provider-icon email-icon" aria-label="email-provider-inline">
                    <el-icon><Message /></el-icon>
                  </div>
                  <div v-if="hasGithubProvider" class="provider-icon github-icon" aria-label="github-provider-inline">
                    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.66-.22.66-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.21-3.37-1.21-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.56 2.35 1.11 2.92.85.09-.67.35-1.11.64-1.37-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.72 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0 1 12 6.84c.85 0 1.71.12 2.51.36 1.9-1.32 2.74-1.05 2.74-1.05.55 1.41.2 2.46.1 2.72.64.72 1.02 1.63 1.02 2.75 0 3.95-2.34 4.82-4.57 5.07.36.32.68.95.68 1.91 0 1.38-.01 2.49-.01 2.83 0 .27.17.59.67.49A10.24 10.24 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"
                      />
                    </svg>
                  </div>
                  <span v-if="!hasEmailProvider && !hasGithubProvider">-</span>
                </div>
              </el-descriptions-item>
            </el-descriptions>
          </el-skeleton>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
.profile-page {
  padding: 16px;

  .top-row {
    margin-bottom: 16px;
  }

  .profile-card,
  .info-card {
    border-radius: 12px;
  }

  .profile-card {
    text-align: center;

    .avatar-wrap {
      display: flex;
      justify-content: center;
      margin-top: 6px;
    }

    h2 {
      margin: 14px 0 4px;
      font-size: 22px;
      color: var(--el-text-color-primary);
    }

    .sub {
      margin: 0;
      color: var(--el-text-color-regular);
    }

    .providers-wrap {
      margin-top: 14px;
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 6px;
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .provider-inline-icons {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .provider-icon {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--el-border-color-light);
    color: var(--el-text-color-regular);
    background: var(--el-fill-color-lighter);

    .el-icon {
      font-size: 14px;
    }

    svg {
      width: 14px;
      height: 14px;
    }
  }

  .email-icon {
    color: var(--el-color-primary);
  }

  .github-icon {
    color: var(--el-text-color-primary);
  }
}
</style>
