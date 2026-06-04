import { ElMessage } from "element-plus";
import { computed } from "vue";

/**
 * 振动监测-服务器监控接口封装。
 * 默认通过 `/m-api` 走 Nuxt 服务端代理，也支持配置完整 API 基址直连监控服务。
 */
export function useServerMonitorApi() {
  const config = useRuntimeConfig();

  const baseUrl = computed(() => {
    const directBase = (config.public as { serverMonitorBase?: string }).serverMonitorBase;
    if (directBase && directBase.length > 0) {
      return directBase.replace(/\/$/, "");
    }

    const prefix =
      (config.public as { serverMonitorApiPrefix?: string }).serverMonitorApiPrefix || "/m-api";
    return prefix.replace(/\/$/, "");
  });

  function joinPath(path: string) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${baseUrl.value}${normalizedPath}`;
  }

  function notifyError(error: unknown, fallback: string) {
    const err = error as { status?: number; statusCode?: number; data?: { detail?: string } } | null;
    const status = err?.statusCode ?? err?.status;

    if (status === 409) {
      ElMessage.warning("检测任务正在执行中，请稍后重试。");
      return;
    }
    if (status === 422) {
      ElMessage.error("参数不合法，请检查阈值范围（0~100）。");
      return;
    }
    if (status === 500) {
      ElMessage.error("服务内部异常，请联系后端查看日志。");
      return;
    }

    ElMessage.error(fallback);
  }

  async function getOverview() {
    return await $fetch(joinPath("system/overview"));
  }

  async function getSystemThresholds() {
    return await $fetch(joinPath("system/thresholds"));
  }

  async function putSystemThresholds(body: Record<string, unknown>) {
    return await $fetch(joinPath("system/thresholds"), {
      method: "PUT",
      body
    });
  }

  async function getSummary() {
    return await $fetch(joinPath("monitor/summary"));
  }

  async function postMonitorRun() {
    return await $fetch(joinPath("monitor/run"), { method: "POST" });
  }

  async function getHealth() {
    return await $fetch(joinPath("health"));
  }

  return {
    baseUrl,
    joinPath,
    getOverview,
    getSystemThresholds,
    putSystemThresholds,
    getSummary,
    postMonitorRun,
    getHealth,
    notifyError
  };
}

/**
 * 将字节数格式化为带单位的展示文本。
 */
export function formatBytes(bytes: number | undefined, fractionDigits = 2): string {
  if (bytes == null || Number.isNaN(bytes)) {
    return "—";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(fractionDigits)} ${units[unitIndex]}`;
}
