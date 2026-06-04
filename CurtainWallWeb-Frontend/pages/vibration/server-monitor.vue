<template>
  <div class="server-monitor-root p-4 space-y-6">
    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="资源总览" name="overview">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
          数据约每 {{ Math.round(overviewIntervalMs / 1000) }} 秒自动刷新
        </p>
        <el-row v-if="overview" :gutter="16">
          <el-col :xs="24" :sm="8">
            <el-card shadow="hover" :class="['metric-card', statusClass(overview.cpu?.status, 'cpu')]">
              <template #header>CPU</template>
              <div class="text-2xl font-semibold">
                {{ overview.cpu?.usage_percent != null ? `${overview.cpu.usage_percent.toFixed(1)}%` : "—" }}
              </div>
              <p class="text-sm mt-1">
                阈值: {{ overview.cpu?.threshold_percent ?? "—" }}% · 核心
                {{ overview.cpu?.cores_physical ?? "—" }}P /
                {{ overview.cpu?.cores_logical ?? "—" }}L
              </p>
              <p v-if="overview.cpu?.status === 'disabled'" class="text-amber-600 text-sm mt-1">
                监控已关闭（仅展示实时占用）
              </p>
            </el-card>
          </el-col>

          <el-col :xs="24" :sm="8">
            <el-card shadow="hover" :class="['metric-card', statusClass(overview.memory?.status, 'mem')]">
              <template #header>内存</template>
              <div class="text-2xl font-semibold">
                {{ overview.memory?.usage_percent != null ? `${overview.memory.usage_percent.toFixed(1)}%` : "—" }}
              </div>
              <p class="text-sm mt-1">
                总量 {{ formatBytes(overview.memory?.total_bytes) }} · 已用
                {{ formatBytes(overview.memory?.used_bytes) }} · 可用
                {{ formatBytes(overview.memory?.available_bytes) }}
              </p>
              <p class="text-sm">阈值: {{ overview.memory?.threshold_percent ?? "—" }}%</p>
            </el-card>
          </el-col>

          <el-col :xs="24" :sm="8">
            <el-card shadow="hover" :class="['metric-card', statusClass(overview.disk?.status, 'disk')]">
              <template #header>磁盘</template>
              <div class="text-2xl font-semibold">
                {{ overview.disk?.usage_percent != null ? `${overview.disk.usage_percent.toFixed(1)}%` : "—" }}
              </div>
              <p class="text-sm mt-1">挂载: {{ overview.disk?.mount_path ?? "—" }}</p>
              <p class="text-sm">
                总量 {{ formatBytes(overview.disk?.total_bytes) }} · 已用
                {{ formatBytes(overview.disk?.used_bytes) }} · 余量
                {{ formatBytes(overview.disk?.free_bytes) }}
              </p>
              <p class="text-sm">阈值: {{ overview.disk?.threshold_percent ?? "—" }}%</p>
            </el-card>
          </el-col>
        </el-row>
        <el-alert v-else type="info" :closable="false" show-icon :title="overviewError" />
      </el-tab-pane>

      <el-tab-pane label="阈值设置" name="thresholds">
        <el-form v-if="thresholdForm" label-width="140px" class="max-w-md">
          <el-form-item label="内存阈值 (%)">
            <el-input-number v-model="thresholdForm.memory_percent" :min="0" :max="100" :step="0.1" />
          </el-form-item>
          <el-form-item label="磁盘阈值 (%)">
            <el-input-number v-model="thresholdForm.disk_percent" :min="0" :max="100" :step="0.1" />
          </el-form-item>
          <el-form-item label="CPU 阈值 (%)">
            <el-input-number v-model="thresholdForm.cpu_percent" :min="0" :max="100" :step="0.1" />
          </el-form-item>
          <el-form-item label="开启 CPU 监控">
            <el-switch v-model="thresholdForm.enable_cpu" />
          </el-form-item>
          <el-form-item v-if="thresholdMeta" label="元数据">
            <span class="text-sm text-gray-500">
              已持久化: {{ thresholdMeta.has_runtime_override ? "是" : "否" }} · 更新时间
              {{ thresholdMeta.updated_at || "—" }}
            </span>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="savingThresholds" @click="saveThresholds">保存</el-button>
          </el-form-item>
        </el-form>
        <el-alert v-else type="info" :closable="false" :title="thresholdError" />
      </el-tab-pane>
    </el-tabs>

    <el-card shadow="hover">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span>监控概览</span>
          <div class="flex gap-2">
            <el-button size="small" :loading="loadingSummary" @click="loadSummary">刷新</el-button>
            <el-button type="primary" size="small" :loading="running" @click="onManualRun">立即检测</el-button>
          </div>
        </div>
      </template>
      <p v-if="summary" class="text-sm text-gray-500 mb-2">
        每 {{ Math.round(summaryIntervalMs / 1000) }} 秒轮询；也可手动点击「刷新」
      </p>
      <el-descriptions v-if="summary" :column="2" border size="small" class="mb-4">
        <el-descriptions-item label="服务健康">
          {{ summary.health?.status ?? "—" }} ({{ summary.health?.timestamp ?? "" }})
        </el-descriptions-item>
        <el-descriptions-item label="监控间隔(秒)">
          {{ summary.monitor_interval_seconds ?? "—" }}
        </el-descriptions-item>
        <el-descriptions-item label="备份失败次数">
          {{ summary.backup_failure_count ?? "—" }}
        </el-descriptions-item>
        <el-descriptions-item label="最近周期">
          <span v-if="summary.latest_cycle">
            {{ summary.latest_cycle.status }} · {{ summary.latest_cycle.trigger }} · 耗时
            {{ summary.latest_cycle.duration_ms ?? "—" }}ms
          </span>
          <span v-else>—</span>
        </el-descriptions-item>
      </el-descriptions>
      <div v-else class="text-sm text-gray-500">
        暂无摘要数据（请确认监控服务已启动，且已配置 NUXT_SERVER_MONITOR_UPSTREAM）
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { formatBytes, useServerMonitorApi } from "~/composables/useServerMonitorApi";

const activeTab = ref("overview");
const api = useServerMonitorApi();
const { notifyError } = api;

const overview = ref<any>(null);
const overviewError = ref("正在加载或无法连接监控服务");
const summary = ref<any>(null);
const loadingSummary = ref(false);
const running = ref(false);
const savingThresholds = ref(false);
const thresholdError = ref("");

const thresholdForm = ref<{
  memory_percent: number;
  disk_percent: number;
  cpu_percent: number;
  enable_cpu: boolean;
} | null>(null);
const thresholdMeta = ref<{
  has_runtime_override?: boolean;
  updated_at?: string;
} | null>(null);

const overviewIntervalMs = 8000;
const summaryIntervalMs = 45000;
let overviewTimer: ReturnType<typeof setInterval> | null = null;
let summaryTimer: ReturnType<typeof setInterval> | null = null;

function statusClass(status: string | undefined, kind: "cpu" | "mem" | "disk") {
  if (status === "alert") {
    return "ring-2 ring-red-400";
  }
  if (status === "disabled" && kind === "cpu") {
    return "opacity-80 bg-slate-50 dark:bg-slate-800";
  }
  return "";
}

async function loadOverview() {
  try {
    overview.value = await api.getOverview();
    overviewError.value = "";
  } catch (error) {
    overviewError.value = "无法拉取 system/overview，请检查监控服务与代理配置";
    notifyError(error, "拉取系统总览失败");
  }
}

async function loadSummary() {
  loadingSummary.value = true;
  try {
    summary.value = await api.getSummary();
  } catch (error) {
    notifyError(error, "拉取监控摘要失败");
  } finally {
    loadingSummary.value = false;
  }
}

async function loadThresholds() {
  try {
    const response: any = await api.getSystemThresholds();
    const system = response?.system;
    if (system) {
      thresholdForm.value = {
        memory_percent: system.memory_percent,
        disk_percent: system.disk_percent,
        cpu_percent: system.cpu_percent,
        enable_cpu: !!system.enable_cpu
      };
      thresholdMeta.value = response?.meta || null;
      thresholdError.value = "";
    } else {
      thresholdError.value = "未返回 system 字段";
    }
  } catch (error) {
    thresholdError.value = "无法加载阈值";
    thresholdForm.value = null;
    notifyError(error, "拉取系统阈值失败");
  }
}

async function saveThresholds() {
  if (!thresholdForm.value) {
    return;
  }

  savingThresholds.value = true;
  try {
    await api.putSystemThresholds({
      memory_percent: thresholdForm.value.memory_percent,
      disk_percent: thresholdForm.value.disk_percent,
      cpu_percent: thresholdForm.value.cpu_percent,
      enable_cpu: thresholdForm.value.enable_cpu
    });
    ElMessage.success("阈值已保存并生效");
    await loadThresholds();
  } catch (error) {
    notifyError(error, "保存阈值失败，请联系后端查看日志");
  } finally {
    savingThresholds.value = false;
  }
}

async function onManualRun() {
  running.value = true;
  try {
    await api.postMonitorRun();
    ElMessage.success("已触发一次监控，正在更新摘要");
    await loadSummary();
  } catch (error) {
    notifyError(error, "触发监控失败");
  } finally {
    running.value = false;
  }
}

onMounted(() => {
  void loadOverview();
  void loadThresholds();
  void loadSummary();
  overviewTimer = setInterval(() => {
    void loadOverview();
  }, overviewIntervalMs);
  summaryTimer = setInterval(() => {
    void loadSummary();
  }, summaryIntervalMs);
});

onBeforeUnmount(() => {
  if (overviewTimer) {
    clearInterval(overviewTimer);
  }
  if (summaryTimer) {
    clearInterval(summaryTimer);
  }
});
</script>

<style scoped>
.server-monitor-root {
  min-height: min-content;
}

.metric-card {
  min-height: 160px;
}
</style>
